// Quill config for the blog editor. Keeps the toolbar tight —
// Amber writes essays, not marketing decks, so we only expose the
// formats that make prose readable (headings, emphasis, lists,
// blockquotes, links). Everything else is intentionally omitted so
// posts stay visually consistent.

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'link'],
    ['clean'],
  ],
}

export const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'list',
  'blockquote',
  'link',
]
