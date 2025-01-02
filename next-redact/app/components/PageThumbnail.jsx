export default function PageThumbnail({ content, pageNumber, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="text-xs font-medium mb-1 text-gray-500">Page {pageNumber + 1}</div>
      <div className="aspect-[3/4] border bg-white rounded overflow-hidden">
        <div className="transform scale-[0.3] origin-top-left whitespace-pre-wrap p-4">
          {content}
        </div>
      </div>
    </div>
  )
};
