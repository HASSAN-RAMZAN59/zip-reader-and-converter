# Add project specific ProGuard rules here.

# Keep React Native Java classes & Native Modules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.systeminfo.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }

# Keep React Native SVG, Vector Icons, AsyncStorage
-keep class com.horcrux.svg.** { *; }
-keep class com.oblador.vectoricons.** { *; }
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Preserve drawable assets & raw resources so images/icons are NEVER stripped
-keepclassmembers class **.R$* {
    public static <fields>;
}
-keep class **.R$* { *; }

# Keep Native methods and reflection
-keepclasseswithmembernames class * {
    native <methods>;
}

-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
