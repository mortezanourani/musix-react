package expo.modules.musicmetadata

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.OpenableColumns
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult.Companion.ACTION_INTENT_SENDER_REQUEST
import androidx.activity.result.contract.ActivityResultContracts.StartIntentSenderForResult.Companion.EXTRA_INTENT_SENDER_REQUEST
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import org.jaudiotagger.tag.Tag
import java.io.File
import java.io.Serializable
import java.security.MessageDigest

/**
 * Reads audio tags and embedded cover art through Android's
 * [MediaMetadataRetriever], and writes supported tags to the original audio
 * file with jaudiotagger.
 *
 * Cover art is written to the app's files directory once and shared between
 * tracks that embed identical bytes, so the JS side can use a plain `file://`
 * URI without shipping image data over the bridge.
 */
class MusicMetadataModule : Module() {
  private lateinit var writeLauncher: AppContextActivityResultLauncher<WriteRequest, Boolean>

  override fun definition() = ModuleDefinition {
    Name("MusicMetadata")

    RegisterActivityContracts {
      writeLauncher = registerForActivityResult(WriteContract())
    }

    AsyncFunction("readMetadata") Coroutine { uris: List<String> ->
      val context = appContext.reactContext

      if (context == null) {
        emptyList<Map<String, Any?>>()
      } else {
        readAll(context, uris)
      }
    }

    AsyncFunction("writeMetadata") Coroutine {
        uri: String,
        title: String,
        artist: String,
        album: String,
        trackNumber: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("The app context is unavailable.")
      val contentUri = Uri.parse(uri)

      if (contentUri.scheme != "content") {
        throw IllegalArgumentException("Only media-library audio files can be edited.")
      }

      if (contentUri.authority != MediaStore.AUTHORITY) {
        throw IllegalArgumentException("Only media-library audio files can be edited.")
      }

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        throw UnsupportedOperationException(
          "Writing audio tags requires Android 11 or newer."
        )
      }

      val approved = withContext(Dispatchers.Main.immediate) {
        writeLauncher.launch(WriteRequest(listOf(contentUri)))
      }

      if (!approved) {
        throw SecurityException("Permission to edit this audio file was not granted.")
      }

      withContext(Dispatchers.IO) {
        writeOne(context, contentUri, title, artist, album, trackNumber)
      }
    }
  }

  private fun writeOne(
    context: Context,
    uri: Uri,
    title: String,
    artist: String,
    album: String,
    trackNumber: String
  ) {
    val extension = getFileExtension(context, uri)
    val original = File.createTempFile("musix-original-", ".$extension", context.cacheDir)
    val edited = File.createTempFile("musix-edited-", ".$extension", context.cacheDir)

    try {
      val input = context.contentResolver.openInputStream(uri)
        ?: throw IllegalStateException("The audio file could not be opened.")
      input.use { source ->
        original.outputStream().use { destination -> source.copyTo(destination) }
      }
      original.copyTo(edited, overwrite = true)

      val audioFile = AudioFileIO.read(edited)
      val tag = audioFile.tagOrCreateAndSetDefault
      setField(tag, FieldKey.ALBUM, album)
      setField(tag, FieldKey.TRACK, trackNumber)
      setField(tag, FieldKey.TITLE, title)
      setField(tag, FieldKey.ARTIST, artist)
      audioFile.commit()

      try {
        copyFileToUri(context, edited, uri)
      } catch (writeError: Exception) {
        try {
          copyFileToUri(context, original, uri)
        } catch (restoreError: Exception) {
          throw IllegalStateException(
            "Writing tags failed and the original audio file could not be restored.",
            writeError
          ).also { it.addSuppressed(restoreError) }
        }
        throw writeError
      }

      context.contentResolver.notifyChange(uri, null)
    } finally {
      original.delete()
      edited.delete()
    }
  }

  private fun setField(tag: Tag, key: FieldKey, value: String) {
    if (value.isBlank()) {
      tag.deleteField(key)
    } else {
      tag.setField(key, value.trim())
    }
  }

  private fun copyFileToUri(context: Context, file: File, uri: Uri) {
    val output = context.contentResolver.openOutputStream(uri, "wt")
      ?: throw IllegalStateException("The audio file could not be written.")
    output.use { destination ->
      file.inputStream().use { source -> source.copyTo(destination) }
    }
  }

  private fun getFileExtension(context: Context, uri: Uri): String {
    val cursor: Cursor? = context.contentResolver.query(
      uri,
      arrayOf(OpenableColumns.DISPLAY_NAME),
      null,
      null,
      null
    )

    val name = cursor?.use {
      if (it.moveToFirst()) {
        it.getString(it.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))
      } else {
        null
      }
    } ?: throw IllegalStateException("The audio file name could not be read.")

    return name.substringAfterLast('.', "").lowercase()
      .takeIf { it.isNotBlank() }
      ?: throw IllegalArgumentException("The audio file has no recognizable extension.")
  }

  private suspend fun readAll(
    context: Context,
    uris: List<String>
  ): List<Map<String, Any?>> = withContext(Dispatchers.IO) {
    uris.chunked(MAX_CONCURRENT_READS).flatMap { chunk ->
      chunk.map { uri -> async { readOne(context, uri) } }.awaitAll()
    }
  }

  private fun readOne(context: Context, uri: String): Map<String, Any?> {
    val retriever = MediaMetadataRetriever()

    return try {
      setDataSource(context, retriever, uri)

      mapOf(
        "title" to cleanTag(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)),
        "artist" to cleanTag(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)),
        "author" to cleanTag(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_AUTHOR)),
        "albumArtist" to cleanTag(
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST)
        ),
        "album" to cleanTag(retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)),
        "trackNumber" to parseTrackNumber(
          retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CD_TRACK_NUMBER)
        ),
        "artworkUri" to saveArtwork(context, retriever.embeddedPicture)
      )
    } catch (_: Exception) {
      // A single unreadable file must not fail the whole scan.
      emptyMap()
    } finally {
      try {
        retriever.release()
      } catch (_: Exception) {
        // Nothing useful to do if releasing fails.
      }
    }
  }

  private fun setDataSource(context: Context, retriever: MediaMetadataRetriever, value: String) {
    val uri = Uri.parse(value)

    when (uri.scheme?.lowercase()) {
      "file" -> retriever.setDataSource(
        uri.path ?: throw IllegalArgumentException("File URI has no path: $value")
      )
      "content", "android.resource" -> retriever.setDataSource(context, uri)
      else -> retriever.setDataSource(value)
    }
  }

  private fun saveArtwork(context: Context, bytes: ByteArray?): String? {
    if (bytes == null || bytes.isEmpty() || bytes.size > MAX_ARTWORK_BYTES) {
      return null
    }

    val extension = imageExtension(bytes) ?: return null
    val directory = File(context.filesDir, ARTWORK_DIRECTORY)

    if (!directory.exists() && !directory.mkdirs()) {
      return null
    }

    val artwork = File(directory, "${sha256(bytes)}.$extension")

    if (!artwork.exists()) {
      val temporary = File.createTempFile("artwork-", ".$extension", directory)

      try {
        temporary.writeBytes(bytes)

        // Another track may have written the same artwork first.
        if (!temporary.renameTo(artwork)) {
          temporary.delete()
        }
      } catch (_: Exception) {
        temporary.delete()
        return null
      }
    }

    return Uri.fromFile(artwork).toString()
  }

  private fun cleanTag(value: String?): String? = value?.trim()?.takeIf { it.isNotEmpty() }

  private fun parseTrackNumber(value: String?): Int? =
    value?.trim()?.substringBefore('/')?.trim()?.toIntOrNull()

  private fun imageExtension(bytes: ByteArray): String? = when {
    bytes.startsWith(0xff, 0xd8, 0xff) -> "jpg"
    bytes.startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) -> "png"
    bytes.size >= 12 &&
      bytes.startsWith(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] == 0x57.toByte() &&
      bytes[9] == 0x45.toByte() &&
      bytes[10] == 0x42.toByte() &&
      bytes[11] == 0x50.toByte() -> "webp"
    bytes.startsWith(0x47, 0x49, 0x46, 0x38) -> "gif"
    else -> null
  }

  private fun ByteArray.startsWith(vararg prefix: Int): Boolean =
    size >= prefix.size && prefix.indices.all { this[it] == prefix[it].toByte() }

  private fun sha256(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256")
      .digest(bytes)
      .joinToString("") { byte -> (byte.toInt() and 0xff).toString(16).padStart(2, '0') }

  companion object {
    private const val ARTWORK_DIRECTORY = "artwork"
    private const val MAX_CONCURRENT_READS = 8
    private const val MAX_ARTWORK_BYTES = 10 * 1024 * 1024
  }
}

private data class WriteRequest(val uris: List<Uri>) : Serializable

private class WriteContract :
  AppContextActivityResultContract<WriteRequest, Boolean> {
  override fun createIntent(context: Context, input: WriteRequest): Intent {
    val request = MediaStore.createWriteRequest(context.contentResolver, input.uris)
    val intentSenderRequest = IntentSenderRequest.Builder(request.intentSender).build()
    return Intent(ACTION_INTENT_SENDER_REQUEST)
      .putExtra(EXTRA_INTENT_SENDER_REQUEST, intentSenderRequest)
  }

  override fun parseResult(input: WriteRequest, resultCode: Int, intent: Intent?): Boolean =
    resultCode == Activity.RESULT_OK
}
