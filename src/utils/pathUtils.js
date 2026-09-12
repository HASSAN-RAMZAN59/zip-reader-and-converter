export const cleanDisplayPath = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  let str = rawPath.trim();
  if (str.startsWith('file://')) {
    str = str.substring(7);
  }
  str = str.replace(/^(\/)?(storage\/)?emulated\/0(\/)?/i, 'Internal Storage/');
  if (str.endsWith('/') && str.length > 17) {
    str = str.slice(0, -1);
  }
  return str;
};
