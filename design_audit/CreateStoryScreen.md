# Component Audit: CreateStoryScreen

## Purpose
The `CreateStoryScreen` allows users to upload content (images/videos) to the "Stories" feature. It handles media selection from the device library, captioning, and uploading to Supabase Storage.

## Key Components
*   **Media Picker:** Large touchable area that launches `expo-image-picker`. Shows preview if selected.
*   **Caption Input:** Simple text input with character counter (limit 200).
*   **Action Bar:** Bottom `Cancel` and `Done` buttons.

## Interactions / State
*   **Image Picking:** Asynchronous call to system gallery. Supports images and videos.
*   **Upload Logic:**
    *   Determines MIME type.
    *   Direct uploads via `FileSystem.uploadAsync` to Supabase Storage (bypassing some JS blob limitations).
    *   Inserts record into `stories` table upon success.
*   **Feedback:** `ActivityIndicator` on the "Done" button during upload.

## Visual / Design Notes
*   **Simplicity:** Focused interface. No distractions.
*   **Colors:** White background, standard gray inputs.

## Notes
*   Specific workaround used for uploading (`FileSystem.uploadAsync` with manual Authorization header) to ensure reliability on React Native.
