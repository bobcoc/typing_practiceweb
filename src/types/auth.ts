// src/types/auth.ts
export interface LoginFormValues {
    username: string;
    password: string;
  }
  export interface RegisterFormValues extends LoginFormValues {
    email?: string;
    confirmPassword: string;
  }
  export interface LoginResponse {
    token: string;
    user: {
      _id: string;
      username: string;
      email: string;
      isAdmin: boolean;
    };
  }
  export interface ErrorResponse {
    message: string;
    code?: string;
  }