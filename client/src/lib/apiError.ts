export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }

  /** True when the request never reached the server (offline, DNS, CORS, server down). */
  get isNetwork() {
    return this.status === 0;
  }
}
