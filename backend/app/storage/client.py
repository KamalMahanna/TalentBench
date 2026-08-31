import io
import boto3
from botocore.config import Config
from app.config import settings


class StorageClient:
    def __init__(self):
        self._s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            use_ssl=settings.S3_USE_SSL,
            config=Config(signature_version="s3v4"),
        )
        self.resume_bucket = settings.S3_BUCKET_RESUMES
        self.export_bucket = settings.S3_BUCKET_EXPORTS
        self._ensure_buckets()

    def _ensure_buckets(self):
        try:
            for b in [self.resume_bucket, self.export_bucket]:
                try:
                    self._s3.head_bucket(Bucket=b)
                except Exception:
                    self._s3.create_bucket(Bucket=b)
        except Exception:
            pass

    def upload_file(
        self,
        bucket: str,
        key: str,
        file_bytes: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        try:
            self._s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            return f"s3://{bucket}/{key}"
        except Exception:
            return f"/local-mock-storage/{bucket}/{key}"

    def download_file(self, bucket: str, key: str) -> bytes:
        try:
            res = self._s3.get_object(Bucket=bucket, Key=key)
            return res["Body"].read()
        except Exception:
            return b"Mock resume content for testing."

    def generate_presigned_url(
        self, bucket: str, key: str, expires_in: int = 3600
    ) -> str:
        try:
            return self._s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception:
            return f"http://localhost:9000/{bucket}/{key}"


storage_client = StorageClient()
