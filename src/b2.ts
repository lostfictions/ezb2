import axios, { AxiosInstance } from "axios";

import { getUrlEncodedFilename, sha1 } from "./util";
import {
  BucketType,
  AuthorizationResponse,
  GetUploadUrlResponse,
  GetDownloadAuthorizationResponse,
  GetFileInfoResponse
} from "./response-types";

const API_VERSION_URL = "/b2api/v1";
const API_AUTHORIZE_URL = `https://api.backblaze.com${API_VERSION_URL}/b2_authorize_account`;

export default class B2 {
  axios!: AxiosInstance;
  accountId!: string;
  downloadUrl!: string;

  /**
   * You can use either the master application key or a normal application key.
   *
   * You'll find the master key on the B2 Cloud Storage Buckets page on the web
   * site. When using the master key, the "key id" is your account ID, and the
   * "application key" is the one you got from the web site.
   *
   * Normal application keys come from the b2_create_key call. When using one of
   * them, the "key id" and "application key" are the ones returned when you
   * created the key.
   */
  async authorize(accountId: string, applicationKey: string) {
    const res = await axios.get<AuthorizationResponse>(API_AUTHORIZE_URL, {
      headers: {
        Authorization: `Basic ${new Buffer(
          accountId + ":" + applicationKey
        ).toString("base64")}`
      }
    });

    this.accountId = accountId;

    this.axios = axios.create({
      baseURL: res.data.apiUrl + API_VERSION_URL,
      headers: {
        Authorization: res.data.authorizationToken
      }
    });

    this.downloadUrl = res.data.downloadUrl;

    return res.data;
  }

  // /////////////
  // buckets
  createBucket(bucketName: string, bucketType: BucketType) {
    return this.axios
      .post("/b2_create_bucket", {
        accountId: this.accountId,
        bucketName: bucketName,
        bucketType: bucketType
      })
      .then(res => res.data);
  }

  deleteBucket(bucketId: string) {
    return this.axios
      .post("/b2_delete_bucket", {
        accountId: this.accountId,
        bucketId: bucketId
      })
      .then(res => res.data);
  }

  listBuckets() {
    return this.axios
      .post("/b2_list_buckets", { accountId: this.accountId })
      .then(res => res.data);
  }

  updateBucket(bucketId: string, bucketType: BucketType) {
    return this.axios
      .post("/b2_update_bucket", {
        accountId: this.accountId,
        bucketId,
        bucketType
      })
      .then(res => res.data);
  }

  // /////////////
  // uploads
  getUploadUrl(data: { bucketId: string }) {
    return this.axios
      .post<GetUploadUrlResponse>("/b2_get_upload_url", data)
      .then(res => res.data);
  }

  uploadFile({
    uploadUrl,
    uploadAuthToken,
    filename,
    data,
    mime,
    hash,
    onUploadProgress
  }: {
    uploadUrl: string;
    uploadAuthToken: string;
    filename: string;
    data: Buffer;
    /** optional mime type, will default to 'b2/x-auto' if not provided */
    mime?: string;
    /** optional data hash, will use sha1(data) if not provided */
    hash?: string;
    onUploadProgress?: (progressEvent: unknown) => void;
  }) {
    const encodedFilename = getUrlEncodedFilename(filename);

    // note we use the global rather than instance axios
    return axios
      .post<GetFileInfoResponse>(uploadUrl, data, {
        headers: {
          Authorization: uploadAuthToken,
          "Content-Type": mime || "b2/x-auto",
          "Content-Length": data.byteLength || data.length,
          "X-Bz-File-Name": encodedFilename,
          "X-Bz-Content-Sha1": hash || sha1(data)
        },
        maxRedirects: 0,
        onUploadProgress
      })
      .then(res => res.data);
  }

  // /////////////
  // query and manipulate files
  listFileNames(data: {
    bucketId: string;
    startFileName?: string;
    maxFileCount?: number;
    prefix?: string;
    delimiter?: string;
  }) {
    return this.axios.post("/b2_list_file_names", data).then(res => res.data);
  }

  listFileVersions(data: {
    bucketId: string;
    startFileName?: string;
    startFileId?: string;
    maxFileCount?: number;
    prefix?: string;
    delimiter?: string;
  }) {
    return this.axios
      .post("/b2_list_file_versions", data)
      .then(res => res.data);
  }

  hideFile(data: { bucketId: string; fileName: string }) {
    return this.axios
      .post<GetFileInfoResponse>("/b2_hide_file", data)
      .then(res => res.data);
  }

  getFileInfo(data: { fileId: string }) {
    return this.axios
      .post<GetFileInfoResponse>("/b2_get_file_info", data)
      .then(res => res.data);
  }

  deleteFileVersion(data: { fileId: string; fileName: string }) {
    return this.axios
      .post("/b2_delete_file_version", data)
      .then(res => res.data);
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
  getDownloadAuthorization(data: {
    bucketId: string;

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
    return this.axios
      .post<GetDownloadAuthorizationResponse>(
        "/b2_get_download_authorization",
        data
      )
      .then(res => res.data);
  }

  downloadFileByName({
    bucketName,
    fileName,
    responseType,
    onDownloadProgress
  }: {
    bucketName: string;
    fileName: string;
    responseType?:
      | "arraybuffer"
      | "blob"
      | "document"
      | "json"
      | "text"
      | "stream";
    onDownloadProgress?: (progressEvent: any) => void;
  }) {
    const encodedFileName = getUrlEncodedFilename(fileName);

    return this.axios
      .get(`${this.downloadUrl}/file/${bucketName}/${encodedFileName}`, {
        responseType,
        onDownloadProgress
      })
      .then(res => res.data);
  }

  downloadFileById({
    fileId,
    responseType,
    onDownloadProgress
  }: {
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
    return this.axios
      .get(
        `${this.downloadUrl}${API_VERSION_URL}/b2_download_file_by_id?fileId=${fileId}`,
        {
          responseType,
          onDownloadProgress
        }
      )
      .then(res => res.data);
  }

  // /////////////
  // large uploads
  startLargeFile({
    bucketId,
    fileName,
    contentType = "b2/x-auto"
  }: {
    bucketId: string;
    fileName: string;
    contentType?: string;
  }) {
    return this.axios
      .post<GetFileInfoResponse>("/b2_start_large_file", {
        bucketId,
        fileName,
        contentType
      })
      .then(res => res.data);
  }

  getUploadPartUrl(data: { fileId: string }) {
    return this.axios
      .post("/b2_get_upload_part_url", data)
      .then(res => res.data);
  }

  uploadPart({
    uploadUrl,
    uploadAuthToken,
    partNumber,
    data,
    onUploadProgress
  }: {
    uploadUrl: string;
    uploadAuthToken: string;
    /** A number from 1 to 10000 */
    partNumber: number;
    data: Buffer;
    onUploadProgress?: (progressEvent: any) => void;
  }) {
    return axios
      .post(uploadUrl, data, {
        headers: {
          Authorization: uploadAuthToken,
          "Content-Length": data.byteLength || data.length,
          "X-Bz-Part-Number": partNumber,
          "X-Bz-Content-Sha1": sha1(data)
        },
        onUploadProgress,
        maxRedirects: 0
      })
      .then(res => res.data);
  }

  finishLargeFile(data: { fileId: string; partSha1Array: string[] }) {
    return this.axios
      .post<GetFileInfoResponse>("/b2_finish_large_file", data)
      .then(res => res.data);
  }

  cancelLargeFile(data: { fileId: string }) {
    return this.axios.post("/b2_cancel_large_file", data).then(res => res.data);
  }
}
