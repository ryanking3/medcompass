"use client";

/* eslint-disable @next/next/no-img-element */

import type { StudyNoteImage } from "@/components/types";
import type { ReactNode } from "react";

export type InlineNoteImage = Pick<StudyNoteImage, "id" | "signedUrl" | "originalFilename">;

const imageTokenPattern = /\[\[note-image:([^\]]+)\]\]/g;

export function noteImageToken(imageId: string) {
  return `[[note-image:${imageId}]]`;
}

export function localNoteImageToken(localId: string) {
  return noteImageToken(`local:${localId}`);
}

function renderText(text: string, keyPrefix: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={`${keyPrefix}-${index}`}>{paragraph}</p>);
}

type NoteInlineContentProps = {
  body: string;
  images: InlineNoteImage[];
  onRemoveImage?: (imageId: string) => void;
  removeDisabled?: boolean;
};

export function NoteInlineContent({ body, images, onRemoveImage, removeDisabled }: NoteInlineContentProps) {
  const imageById = new Map(images.map((image) => [image.id, image]));
  const usedImageIds = new Set<string>();
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageTokenPattern.exec(body)) !== null) {
    const [token, imageId] = match;
    const textBefore = body.slice(lastIndex, match.index);
    parts.push(...renderText(textBefore, `text-${lastIndex}`));

    const image = imageById.get(imageId);
    if (image?.signedUrl) {
      usedImageIds.add(image.id);
      parts.push(<figure key={`image-${image.id}`}>
        <img src={image.signedUrl} alt={image.originalFilename ?? "Note image"} />
        <figcaption><span>{image.originalFilename ?? "Pasted image"}</span>{onRemoveImage && <button onClick={() => onRemoveImage(image.id)} disabled={removeDisabled}>Remove</button>}</figcaption>
      </figure>);
    } else {
      parts.push(<p key={`missing-${match.index}`} className="missing-image-token">{token}</p>);
    }

    lastIndex = match.index + token.length;
  }

  parts.push(...renderText(body.slice(lastIndex), `text-${lastIndex}`));

  for (const image of images) {
    if (usedImageIds.has(image.id) || !image.signedUrl) continue;
    parts.push(<figure key={`unused-${image.id}`}>
      <img src={image.signedUrl} alt={image.originalFilename ?? "Note image"} />
      <figcaption><span>{image.originalFilename ?? "Pasted image"}</span>{onRemoveImage && <button onClick={() => onRemoveImage(image.id)} disabled={removeDisabled}>Remove</button>}</figcaption>
    </figure>);
  }

  if (!parts.length) return null;

  return <div className="note-inline-content">{parts}<style jsx>{`
    .note-inline-content { display: grid; gap: 14px; margin-top: 18px; padding-top: 18px; border-top: 1px solid #ecf0eb; }
    .note-inline-content p { margin: 0; color: #475657; font: 16px/1.72 Georgia, serif; white-space: pre-wrap; }
    .note-inline-content figure { overflow: hidden; margin: 0; border: 1px solid #dce7df; border-radius: 10px; background: #f8faf7; }
    .note-inline-content img { display: block; width: 100%; max-height: 430px; object-fit: contain; background: white; }
    .note-inline-content figcaption { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; color: #66756f; font-size: 10px; }
    .note-inline-content figcaption span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .note-inline-content figcaption button { border: 0; color: #9a4a4a; background: transparent; font-size: 10px; font-weight: 800; }
    .missing-image-token { color: #9a6a3d !important; background: #fff5df; border-radius: 7px; padding: 9px 10px; font-size: 11px !important; }
  `}</style></div>;
}
