package com.zipapp

import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class ManageStorageModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ManageStorageModule"

    @ReactMethod
    fun isExternalStorageManager(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                promise.resolve(Environment.isExternalStorageManager())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestManageStoragePermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (Environment.isExternalStorageManager()) {
                    promise.resolve(true)
                    return
                }
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:" + reactContext.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            try {
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(fallbackIntent)
                promise.resolve(false)
            } catch (err: Exception) {
                promise.reject("ERROR", err.message)
            }
        }
    }

    @ReactMethod
    fun openFile(filePath: String, customMimeType: String?, promise: Promise) {
        try {
            val cleanPath = if (filePath.startsWith("file://")) {
                filePath.substring(7)
            } else {
                filePath
            }

            val file = File(cleanPath)
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $cleanPath")
                return
            }

            val uri: Uri = try {
                FileProvider.getUriForFile(
                    reactContext,
                    reactContext.packageName + ".provider",
                    file
                )
            } catch (e: Exception) {
                Uri.fromFile(file)
            }

            val mimeType = if (!customMimeType.isNullOrEmpty()) {
                customMimeType
            } else {
                val extension = MimeTypeMap.getFileExtensionFromUrl(Uri.fromFile(file).toString())
                if (extension.isNotEmpty()) {
                    MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.lowercase()) ?: "*/*"
                } else {
                    "*/*"
                }
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeType)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getVideoThumbnail(videoPath: String, promise: Promise) {
        var isResolved = false
        val safeResolve: (String?) -> Unit = { uri ->
            if (!isResolved) {
                isResolved = true
                try {
                    promise.resolve(uri)
                } catch (t: Throwable) {}
            }
        }

        Thread {
            var retriever: MediaMetadataRetriever? = null
            try {
                val cleanPath = if (videoPath.startsWith("file://")) {
                    videoPath.substring(7)
                } else {
                    videoPath
                }

                val file = File(cleanPath)
                if (!file.exists() || file.length() <= 0) {
                    safeResolve(null)
                    return@Thread
                }

                // Check cache first
                val safeHash = Math.abs(cleanPath.hashCode())
                val thumbFileName = "vthumb_" + safeHash + ".jpg"
                val thumbFile = File(reactContext.cacheDir, thumbFileName)
                if (thumbFile.exists() && thumbFile.length() > 0) {
                    safeResolve("file://" + thumbFile.absolutePath)
                    return@Thread
                }

                retriever = MediaMetadataRetriever()
                retriever.setDataSource(cleanPath)
                val bitmap: Bitmap? = try {
                    retriever.getFrameAtTime(1000000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                        ?: retriever.frameAtTime
                } catch (e: Throwable) {
                    retriever.frameAtTime
                }

                if (bitmap != null) {
                    val maxDim = 240
                    val finalBitmap = if (bitmap.width > maxDim || bitmap.height > maxDim) {
                        val scale = maxDim.toFloat() / Math.max(bitmap.width, bitmap.height)
                        val targetW = Math.max(1, (bitmap.width * scale).toInt())
                        val targetH = Math.max(1, (bitmap.height * scale).toInt())
                        val scaled = Bitmap.createScaledBitmap(bitmap, targetW, targetH, true)
                        if (scaled != bitmap) {
                            bitmap.recycle()
                        }
                        scaled
                    } else {
                        bitmap
                    }

                    val out = FileOutputStream(thumbFile)
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 75, out)
                    out.flush()
                    out.close()
                    if (finalBitmap != bitmap) {
                        finalBitmap.recycle()
                    }
                    safeResolve("file://" + thumbFile.absolutePath)
                } else {
                    safeResolve(null)
                }
            } catch (t: Throwable) {
                safeResolve(null)
            } finally {
                try {
                    retriever?.close()
                } catch (ignored: Throwable) {
                    try {
                        retriever?.release()
                    } catch (ignored2: Throwable) {}
                }
            }
        }.start()
    }
}
