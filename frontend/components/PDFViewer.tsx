interface Props {
  fileUrl: string | null;
}

export default function PDFViewer({ fileUrl }: Props) {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 transition-colors">
      {fileUrl ? (
        <iframe
          src={fileUrl}
          className="w-full h-full"
          title="PDF Viewer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <p>No PDF loaded</p>
          <span className="text-sm mt-2">(Upload a file to view it here)</span>
        </div>
      )}
    </div>
  );
}