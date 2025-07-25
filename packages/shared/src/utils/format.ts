const CHINESE_STRING_REGEXP = /[\u4e00-\u9fa5]/
export const isChinese = (text: string): boolean => CHINESE_STRING_REGEXP.test(text) // 匹配中文字符
