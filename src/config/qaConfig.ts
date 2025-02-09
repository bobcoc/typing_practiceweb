export interface QAItem {
  question: string;
  answer: string;
  category: string;
}

export interface QAConfig {
  firstSectionTitle: string;
  firstSectionSubtitle: string;
  firstSectionCount: number;
  secondSectionTitle: string;
  secondSectionSubtitle: string;
  secondSectionCount: number;
  qaContent: QAItem[];
}

// 默认配置，作为后备方案
export const defaultQaConfig: QAConfig = {
  firstSectionTitle: "AI教育常见问题解答",
  firstSectionSubtitle: "智慧教学实践指南",
  firstSectionCount: 4,
  secondSectionTitle: "第一课堂AI平台",
  secondSectionSubtitle: "智慧教学的得力助手，创新学习的引航明灯",
  secondSectionCount: 4,
  qaContent: []  // 默认为空数组，实际内容从远程加载
};

// 从远程获取配置
export const getQaConfig = async (): Promise<QAConfig> => {
  try {
    const response = await fetch('/config/qa-config.json');
    if (!response.ok) {
      throw new Error('Failed to load config');
    }
    const config = await response.json();
    return config;
  } catch (error) {
    console.warn('Failed to load remote config, using default:', error);
    return defaultQaConfig;
  }
}; 