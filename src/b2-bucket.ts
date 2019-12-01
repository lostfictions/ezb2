import B2 from "./b2";

/**
 * Simplifies some use-cases when using an application key limited to a single
 * bucket.
 */
export default class B2Bucket {
  bucketId!: string;
  b2!: B2;

  /**
   * Normal application keys come from the b2_create_key call. When using one of
   * them, the "key id" and "application key" are the ones returned when you
   * created the key.
   */
  async authorize({
    accountId,
    applicationKey,
    bucketId
  }: {
    accountId: string;
    applicationKey: string;
    bucketId: string;
  }) {
    this.bucketId = bucketId;
    this.b2 = new B2();

    const resp = await this.b2.authorize(accountId, applicationKey);
    const {
      allowed: { bucketId: allowedBucketId }
    } = resp;

    if (!allowedBucketId || allowedBucketId !== bucketId) {
      throw new Error(
        `Allowed bucket does not match provided bucket id! Bucket id returned: ${allowedBucketId}`
      );
    }

    return resp;
  }

  // /////////////
  // uploads
  async upload(opts: {
    filename: string;
    data: Buffer;
    /** optional mime type, will default to 'b2/x-auto' if not provided */
    mime?: string;
    /** optional data hash, will use sha1(data) if not provided */
    hash?: string;
    onUploadProgress?: (progressEvent: any) => void;
  }) {
    const {
      uploadUrl,
      authorizationToken: uploadAuthToken
    } = await this.getUploadUrl();

    return this.uploadFile({
      uploadUrl,
      uploadAuthToken,
      ...opts
    });
  }

  getUploadUrl() {
    return this.b2.getUploadUrl({ bucketId: this.bucketId });
  }

  uploadFile(opts: {
    uploadUrl: string;
    uploadAuthToken: string;
    filename: string;
    data: Buffer;
    /** optional mime type, will default to 'b2/x-auto' if not provided */
    mime?: string;
    /** optional data hash, will use sha1(data) if not provided */
    hash?: string;
    onUploadProgress?: (progressEvent: any) => void;
  }) {
    return this.b2.uploadFile(opts);
  }

  // /////////////
  // query and manipulate files
  listFileNames(
    opts: {
      startFileName?: string;
      maxFileCount?: number;
      delimiter?: string;
      prefix?: string;
    } = {}
  ) {
    return this.b2.listFileNames({
      bucketId: this.bucketId,
      ...opts
    });
  }

  listFileVersions(
    opts: {
      startFileName?: string;
      startFileId?: string;
      maxFileCount?: number;
      delimiter?: string;
      prefix?: string;
    } = {}
  ) {
    return this.b2.listFileVersions({
      bucketId: this.bucketId,
      ...opts
    });
  }

  hideFile(opts: { fileName: string }) {
    return this.b2.hideFile({
      bucketId: this.bucketId,
      ...opts
    });
  }

  getFileInfo(opts: { fileId: string }) {
    return this.b2.getFileInfo(opts);
  }

  deleteFileVersion(opts: { fileId: string; fileName: string }) {
    return this.b2.deleteFileVersion(opts);
  }

  // /////////////
  // downloads

  /**
   * Used to generate an authorization token that can be used to download
   * files with the specified prefix (and other optional headers) from a
   * private B2 bucket. Returns an authorization token that can be passed to
   * `b2_download_file_by_name` in the Authorization header or as an
   * Authorization parameter.
   */
  getDownloadAuthorization(opts: {
    /**
     * The file name prefix of files the download authorization token will
     * allow `downloadFileByName` to access. For example, if you have a
     * private bucket named "photos" and generate a download authorization
     * token for the fileNamePrefix "pets/" you will be able to use the
     * download authorization token to access:
     * https://f345.backblazeb2.com/file/photos/pets/kitten.jpg but not:
     * https://f345.backblazeb2.com/file/photos/vacation.jpg.
     */
    fileNamePrefix: string;
    /**
     * The number of seconds before the authorization token will expire. The
     * minimum value is 1 second. The maximum value is 604800 which is one
     * week in seconds.
     */
    validDurationInSeconds: number;
    /**
     *  If this is present, download requests using the returned authorization
     *  must include the same value for b2ContentDisposition. The value must
     *  match the grammar specified in RFC 6266 (except that parameter names
     *  that contain an '*' are not allowed).
     */
    b2ContentDisposition?: string;
  }) {
    return this.b2.getDownloadAuthorization({
      bucketId: this.bucketId,
      ...opts
    });
  }

  downloadFileByName(opts: {
    bucketName: string;
    fileName: string;
    responseType:
      | "arraybuffer"
      | "blob"
      | "document"
      | "json"
      | "text"
      | "stream";
    onDownloadProgress?: (progressEvent: any) => void;
  }) {
    return this.b2.downloadFileByName(opts);
  }

  downloadFileById(opts: {
    fileId: string;
    responseType:
      | "arraybuffer"
      | "blob"
      | "document"
      | "json"
      | "text"
      | "stream";
    onDownloadProgress?: (progressEvent: any) => void;
  }) {
    return this.b2.downloadFileById(opts);
  }

  // /////////////
  // large uploads
  startLargeFile(opts: { fileName: string; contentType?: string }) {
    return this.b2.startLargeFile({
      bucketId: this.bucketId,
      ...opts
    });
  }

  getUploadPartUrl(opts: { fileId: string }) {
    return this.b2.getUploadPartUrl(opts);
  }

  uploadPart(opts: {
    uploadUrl: string;
    uploadAuthToken: string /** A number from 1 to 10000 */;
    partNumber: number;
    data: Buffer;
    onUploadProgress?: (progressEvent: any) => void;
  }) {
    return this.b2.uploadPart(opts);
  }

  finishLargeFile(opts: { fileId: string; partSha1Array: string[] }) {
    return this.b2.finishLargeFile(opts);
  }

  cancelLargeFile(opts: { fileId: string }) {
    return this.b2.cancelLargeFile(opts);
  }
}
