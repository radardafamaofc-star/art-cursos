import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onFileSelect,
  disabled,
  className,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    disabled,
  });

  const handleRemove = () => {
    setPreview(undefined);
    onChange(undefined);
  };

  return (
    <div className={className}>
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {isDragActive ? (
                <Upload className="h-6 w-6 text-primary" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragActive ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG ou WEBP (máx. 5MB)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
