import { productImageUrl } from '@/lib/products'

export default function ProductThumb({
  src,
  alt,
  size = 64,
}: {
  src: string | null | undefined
  alt: string
  size?: number
}) {
  const url = productImageUrl(src)
  return (
    <div
      className="shrink-0 border border-[#3D5248] bg-[#0a0f0c] flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="label-caps text-[9px] text-[#6B7A74]">нет фото</span>
      )}
    </div>
  )
}
