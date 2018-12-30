export type BucketType = "allPublic" | "allPrivate";
export type BucketCapabilities =
  | "listKeys"
  | "writeKeys"
  | "deleteKeys"
  | "listBuckets"
  | "writeBuckets"
  | "deleteBuckets"
  | "listFiles"
  | "readFiles"
  | "shareFiles"
  | "writeFiles"
  | "deleteFiles";

export interface AuthorizationResponse {
  /**
   * The identifier for the account.
   */
  accountId: string;

  /**
   * An authorization token to use with all calls, other than
   * b2_authorize_account, that need an Authorization header. This
   * authorization token is valid for at most 24 hours.
   */
  authorizationToken: string;

  /**
   * An object containing the capabilities of this auth token, and any
   * restrictions on using it.
   */
  allowed: {
    /**
     * A list of strings, each one naming a capability the key has.
     */
    capabilities: BucketCapabilities[];

    /**
     * When present, access is restricted to one bucket.
     */
    bucketId?: string;

    /**
     * When `bucketId` is set, and it is a valid bucket that has not been
     * deleted, this field is set to the name of the bucket. It's possible
     * that `bucketId` is set to a bucket that no longer exists, in which case
     * this field will be null. It's also null when `bucketId` is null.
     */
    bucketName?: string;

    /**
     * When present, access is restricted to files whose names start with the
     * prefix.
     */
    namePrefix?: string;
  };

  /**
   * The base URL to use for all API calls except for uploading and
   * downloading files.
   */
  apiUrl: string;

  /**
   * The base URL to use for downloading files.
   */
  downloadUrl: string;

  /**
   * The recommended size for each part of a large file. We recommend using
   * this part size for optimal upload performance.
   */
  recommendedPartSize: number;

  /**
   * The smallest possible size of a part of a large file (except the last
   * one).This is smaller than the `recommendedPartSize`. If you use it, you
   * may find that it takes longer overall to upload a large file.
   */
  absoluteMinimumPartSize: number;
}

export interface GetUploadUrlResponse {
  /**
   * The unique ID of the bucket.
   */
  bucketId: string;

  /**
   * The URL that can be used to upload files to this bucket via uploadFile.
   */
  uploadUrl: string;

  /**
   * The `authorizationToken` that must be used when uploading files to this
   * bucket. This token is valid for 24 hours or until the `uploadUrl` endpoint
   * rejects an upload.
   */
  authorizationToken: string;
}

export interface StartLargeFileResponse {
  /**
   * The account that owns the file.
   */
  accountId: string;

  /**
   * One of "start", "upload", "hide", "folder", or other values added in the
   * future.
   *
   * - "upload" means a file that was uploaded to B2 Cloud Storage.
   * - "start" means that a large file has been started, but not finished or
   *    canceled.
   * - "hide" means a file version marking the file as hidden, so that it will
   *    not show up in b2_list_file_names.
   * - "folder" is used to indicate a virtual folder when listing files.
   */
  action: "start" | "upload" | "hide" | "folder";

  /**
   * The bucket that the file is in.
   */
  bucketId: string;

  /**
   * The number of bytes stored in the file. Only useful when the action is
   * "upload". Always 0 when the action is "start", "hide", or "folder".
   */
  contentLength: number;

  /**
   * The SHA1 of the bytes stored in the file as a 40 - digit hex string. Large
   * files do not have SHA1 checksums, and the value is "none". The value is
   * null when the action is "hide" or "folder".
   */
  contentSha1: string;

  /**
   * When the action is "upload" or "start", the MIME type of the file, as
   * specified when the file was uploaded. For "hide" action, always
   * "application/x-bz-hide-marker". For "folder" action, always null.
   */
  contentType: string;

  /**
   * The unique identifier for this version of this file. Used with
   * b2_get_file_info, b2_download_file_by_id, and b2_delete_file_version. The
   * value is null when for action "folder".
   */
  fileId?: string;

  /**
   * The custom information that was uploaded with the file. This is a JSON
   * object, holding the name / value pairs that were uploaded with the file.
   */
  fileInfo: string;

  /**
   * The name of this file, which can be used with b2_download_file_by_name.
   */
  fileName: string;

  /**
   * This is a UTC time when this file was uploaded. It is a base 10 number of
   * milliseconds since midnight, January 1, 1970 UTC.
   *
   * Always 0 when the action is "folder".
   */
  uploadTimestamp: number;
}
