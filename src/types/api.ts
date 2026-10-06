/** Shape used for existing HTTP error handling; it does not change response behavior. */
export interface RequestError {
  message?: string;
  response?: {
    status?: number;
    data?: { message?: string };
  };
}
