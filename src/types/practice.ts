export interface PracticeStats {
    totalWords: number;
    correctWords: number;
    accuracy: number;
    wordsPerMinute: number;
    duration: number;
    startTime: Date;
    endTime: Date;
  }
  
  export interface PracticeRecord {
    _id: string;
    userId: string;
    username: string;
    fullname: string;
    type: 'keyword' | 'basic' | 'intermediate' | 'advanced';
    stats: PracticeStats;
    createdAt: Date;
    updatedAt: Date;
  }