// src/types/auth.ts
export interface LoginFormValues {
    username: string;
    password: string;
  }
  
  export interface LoginResponse {
    token: string;
    user: {
      _id: string;
      username: string;
      isAdmin: boolean;
    };
  }
  
  export interface ErrorResponse {
    message: string;
    code?: string;
  }