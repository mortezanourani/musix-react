package expo.modules.musicmetadata

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest

/**
 * Reads audio tags and embedded cover art through Android's
 * [MediaMetadataRetriever].
 *
 * Cover art is written to the app's files directory once and shared between
 * tracks that embed identical bytes, so the JS side can use a plain `file://`
 * URI without shipping image data over the bridge.
 */
class MusicMetadataModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MusicMetadata")

    AsyncFunction("readMetadata") Coroutine { uris: List<String> ->
      val context = appContext.reactContext

      if (context == null) {
        emptyList<Map<String, Any?>>()
      } else {
        readAll(context, uris)
      }
    }
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
