'use client';

import Image from 'next/image';
import { Camera, X } from 'lucide-react';

/**
 * Reusable PhotoUpload component that displays a dropzone or image preview.
 */
export default function PhotoUpload({
    label,
    sublabel,
    preview,
    inputRef,
    onSelectImage,
    onRemove,
    fieldName,
    accept = ".jpg,.jpeg,.png,.webp"
}) {
    return (
        <div className="border border-[#D4AF37]/15 p-6 bg-[#081C3A] flex flex-col justify-between space-y-4">
            <div>
                <label className="text-[10.5px] uppercase tracking-wider text-white font-bold block">
                    {label}
                </label>
                <p className="text-[9px] text-[#D9E1EC]/40 leading-relaxed mt-0.5">
                    {sublabel}
                </p>
            </div>

            {preview ? (
                <div className="relative aspect-[3/4] w-full border border-[#D4AF37]/35 overflow-hidden group bg-black/40">
                    <Image
                        src={preview}
                        alt={`${label} Preview`}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-3">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="px-3 py-1.5 bg-[#D4AF37] text-[#081C3A] font-bold text-[9px] uppercase tracking-wider hover:bg-white transition-colors"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(fieldName)}
                            className="p-1.5 bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-[#D4AF37]/25 hover:border-[#D4AF37]/60 aspect-[3/4] cursor-pointer flex flex-col items-center justify-center bg-[#0B2347]/50 gap-2 transition-all p-4"
                >
                    <Camera className="w-8 h-8 text-[#D4AF37]/60" />
                    <span className="text-[10px] text-[#D9E1EC]/60 uppercase tracking-widest font-bold">Select {label.replace(/ \*$/, '')}</span>
                    <span className="text-[9px] text-[#D9E1EC]/30">Click to upload</span>
                </div>
            )}

            <input
                type="file"
                ref={inputRef}
                accept={accept}
                onChange={(e) => onSelectImage(e, fieldName)}
                className="hidden"
            />
        </div>
    );
}
