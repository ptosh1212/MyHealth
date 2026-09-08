
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export async function POST(req: Request) {
  try {
    // ------------------------------------------------------------
    // CHECK CLOUDINARY CONFIGURATION
    // ------------------------------------------------------------

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary environment variables:', {
        cloudName: !!cloudName,
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
      });

      return NextResponse.json(
        {
          error:
            'Cloudinary environment variables are missing on the server.',
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // READ FORM DATA
    // ------------------------------------------------------------

    const formData = await req.formData();

    const file = formData.get('file');
    const type = formData.get('type');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'No valid file was provided.',
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // FILE SIZE CHECK
    // ------------------------------------------------------------

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File is too large. Maximum size is 10 MB.',
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // CONVERT FILE TO BUFFER
    // ------------------------------------------------------------

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folderType =
      typeof type === 'string' && type.trim()
        ? type.trim()
        : 'documents';

    // ------------------------------------------------------------
    // UPLOAD TO CLOUDINARY
    // ------------------------------------------------------------

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
      resource_type: string;
    }>((resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder: `my-health/${folderType}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              console.error(
                'CLOUDINARY ERROR:',
                error
              );

              reject(error);
              return;
            }

            if (!result) {
              reject(
                new Error(
                  'Cloudinary returned an empty result.'
                )
              );
              return;
            }

            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              resource_type: result.resource_type,
            });
          }
        );

      uploadStream.end(buffer);
    });

    // ------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------

    console.log(
      'Cloudinary upload successful:',
      result.public_id
    );

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
    });
  } catch (error) {
    console.error(
      'CLOUDINARY UPLOAD ERROR:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}

