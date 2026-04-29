export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
});

export const errorResponse = (error: string, message?: string): ApiResponse<null> => ({
  success: false,
  error,
  message: message || error,
  timestamp: new Date().toISOString(),
});
