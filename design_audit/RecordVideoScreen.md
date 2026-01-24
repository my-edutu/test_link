# Component Audit: RecordVideoScreen

## Purpose
`RecordVideoScreen` enables users to upload video clips for language preservation. It emphasizes providing metadata (language, dialect, prompt) to make the content useful.

## Key Components
*   **Media Picker:** Integration with `expo-document-picker` for selecting video files.
*   **Language Selector:** Modal trigger to select the spoken language.
*   **Prompt Input:** Text area for describing the video content ("Phrase").
*   **Preview:** `VideoView` (from `expo-video`) to review the selected file before upload.

## Interactions / State
*   **Upload Process:**
    1.  Upload video to Supabase Storage.
    2.  Generate thumbnail (at 1s mark) using `expo-video-thumbnails`.
    3.  Upload thumbnail.
    4.  Insert record into `video_clips` table.
*   **Validation:** Prevents upload without Language, Video, or Prompt.

## Visual / Design Notes
*   **Cards:** Uses a card layout for the Prompt section (`#FEF3E2` background).
*   **Thumbnails:** Automatic generation improves the feed experience later.

## Notes
*   This is the video equivalent of `RecordVoiceScreen`. Currently supports *uploading* existing files. Direct camera recording might be a future add-on.
