/**
 * Getting the words out of a CV.
 *
 * Three formats, because those are the three people actually send: PDF from
 * anyone who exported one, .docx from anyone still editing theirs, and .doc
 * from a surprising number of Nigerian university machines running old Office.
 *
 * The old .doc binary format is not parsed — it is a compound-document
 * container that needs a heavy dependency to read, and the honest answer is
 * to accept the file, store it so a coordinator can open it, and say that the
 * text could not be read automatically. A CV that cannot be searched is still
 * a CV somebody can look at.
 *
 * Nothing here throws. A CV that will not parse must never cost somebody their
 * application — the file is kept either way and the text is simply absent.
 */

export type Extracted = {
  text: string;
  /** Why there is no text, when there is none. */
  note?: string;
};

const MAX_TEXT = 60_000; // ~12,000 words. Longer than any real CV.

/** Collapse the whitespace soup that PDF extraction produces. */
function tidy(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}

export async function extractCvText(file: {
  buffer: ArrayBuffer;
  type: string;
  name: string;
}): Promise<Extracted> {
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");
  const isDoc = file.type === "application/msword" || name.endsWith(".doc");
  const isTxt = file.type === "text/plain" || name.endsWith(".txt");

  try {
    if (isPdf) {
      /* Imported here rather than at the top of the file so a CV upload is the
         only thing that ever loads a PDF engine — it is a large dependency and
         every other page would pay for it at cold start. */
      const { extractText, getDocumentProxy } = await import("unpdf");
      const doc = await getDocumentProxy(new Uint8Array(file.buffer));
      const { text } = await extractText(doc, { mergePages: true });
      const out = tidy(Array.isArray(text) ? text.join("\n") : text);

      /* A scanned CV is a picture of a document. There is nothing to extract,
         and saying so is more useful than returning three characters. */
      if (out.length < 40) {
        return {
          text: "",
          note: "This looks like a scanned PDF — an image of a page rather than text. The file is saved and can be opened, but it cannot be searched or summarised.",
        };
      }
      return { text: out };
    }

    if (isDocx) {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file.buffer) });
      return { text: tidy(value) };
    }

    if (isTxt) {
      return { text: tidy(new TextDecoder().decode(file.buffer)) };
    }

    if (isDoc) {
      return {
        text: "",
        note: "This is an old Word (.doc) file. It is saved and can be opened, but its text cannot be read automatically — ask them for a PDF if you need it searchable.",
      };
    }

    return { text: "", note: "That file type cannot be read." };
  } catch {
    /* Corrupt, encrypted, or something claiming to be a PDF and not being one.
       The file is already stored; losing the text is not worth losing the
       application over. */
    return {
      text: "",
      note: "The text could not be read from this file. It is saved and can still be opened.",
    };
  }
}
