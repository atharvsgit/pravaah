import boto3
from fastapi import UploadFile, HTTPException
from app.core.config import settings
import uuid

class S3Service:
    def __init__(self):
        """
        Initializes the Boto3 S3 client using credentials from the settings.
        """
        try:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION
            )
            self.bucket_name = settings.AWS_S3_BUCKET_NAME
        except Exception as e:
            print(f"Error initializing S3 client: {e}")
            self.s3_client = None
            self.bucket_name = None

    def upload_file(self, file: UploadFile, media_type: str, report_id: uuid.UUID) -> str:
        """
        Uploads a file to the configured S3 bucket and returns its public URL.
        """
        if not self.s3_client:
            raise HTTPException(status_code=500, detail="S3 service is not configured.")

        try:
            file_extension = file.filename.split('.')[-1]
            unique_filename = f"{report_id}-{uuid.uuid4()}.{file_extension}"
            s3_key = f"{media_type}s/{unique_filename}"

            extra_args = {'ContentType': file.content_type, 'ACL': 'public-read'}

            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )

            file_url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{s3_key}"
            
            print(f"Successfully uploaded {file.filename} to {file_url}")
            return file_url

        except Exception as e:
            print(f"Error uploading file to S3: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload file to storage.")

s3_service = S3Service()

