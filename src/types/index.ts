// 练习类型接口
export interface PracticeType {
  _id: string;
  title: string;
  description: string;
  level: PracticeLevel;
}

// 代码示例接口
export interface CodeExample {
  _id: string;
  title: string;
  content: string;
  level: PracticeLevel;
  createdAt?: Date;
  updatedAt?: Date;
  codeLines?: string[];
}

// 练习级别类型
export type PracticeLevel = 'keyword' | 'basic' | 'intermediate' | 'advanced'; 