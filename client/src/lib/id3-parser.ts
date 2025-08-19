export interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  track?: string;
  albumArt?: string;
  duration?: number;
}

export class ID3Parser {
  static async parseFile(file: File): Promise<ID3Tags> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const tags = this.parseID3v2(buffer) || this.parseID3v1(buffer);
          resolve(tags);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static parseID3v2(buffer: ArrayBuffer): ID3Tags | null {
    const view = new DataView(buffer);
    const tags: ID3Tags = {};

    // Check for ID3v2 header
    if (buffer.byteLength < 10) return null;
    
    const id3Header = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2)
    );
    
    if (id3Header !== 'ID3') return null;

    const majorVersion = view.getUint8(3);
    const minorVersion = view.getUint8(4);
    const flags = view.getUint8(5);
    
    // Parse size (synchsafe integer)
    const size = (view.getUint8(6) << 21) |
                 (view.getUint8(7) << 14) |
                 (view.getUint8(8) << 7) |
                 view.getUint8(9);

    let offset = 10;
    const endOffset = offset + size;

    // Parse frames
    while (offset < endOffset - 10) {
      const frameId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );

      const frameSize = majorVersion >= 4 
        ? (view.getUint8(offset + 4) << 21) |
          (view.getUint8(offset + 5) << 14) |
          (view.getUint8(offset + 6) << 7) |
          view.getUint8(offset + 7)
        : (view.getUint8(offset + 4) << 24) |
          (view.getUint8(offset + 5) << 16) |
          (view.getUint8(offset + 6) << 8) |
          view.getUint8(offset + 7);

      if (frameSize === 0) break;

      const frameFlags = view.getUint16(offset + 8);
      const frameDataOffset = offset + 10;

      // Extract text data (skip encoding byte)
      const textData = this.extractTextData(view, frameDataOffset + 1, frameSize - 1);

      switch (frameId) {
        case 'TIT2':
          tags.title = textData;
          break;
        case 'TPE1':
          tags.artist = textData;
          break;
        case 'TALB':
          tags.album = textData;
          break;
        case 'TYER':
        case 'TDRC':
          tags.year = textData;
          break;
        case 'TCON':
          tags.genre = textData;
          break;
        case 'TRCK':
          tags.track = textData;
          break;
        case 'APIC':
          // Handle album art (simplified)
          tags.albumArt = this.extractAlbumArt(view, frameDataOffset, frameSize);
          break;
      }

      offset += 10 + frameSize;
    }

    return tags;
  }

  private static parseID3v1(buffer: ArrayBuffer): ID3Tags {
    const view = new DataView(buffer);
    const tags: ID3Tags = {};

    // ID3v1 is in the last 128 bytes
    if (buffer.byteLength < 128) return tags;

    const offset = buffer.byteLength - 128;
    
    const tagHeader = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2)
    );

    if (tagHeader !== 'TAG') return tags;

    // Extract fields
    tags.title = this.extractFixedString(view, offset + 3, 30);
    tags.artist = this.extractFixedString(view, offset + 33, 30);
    tags.album = this.extractFixedString(view, offset + 63, 30);
    tags.year = this.extractFixedString(view, offset + 93, 4);
    
    // Genre
    const genreIndex = view.getUint8(offset + 127);
    tags.genre = this.getGenreName(genreIndex);

    return tags;
  }

  private static extractTextData(view: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const byte = view.getUint8(offset + i);
      if (byte === 0) break; // Null terminator
      result += String.fromCharCode(byte);
    }
    return result.trim();
  }

  private static extractFixedString(view: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const byte = view.getUint8(offset + i);
      if (byte === 0) break;
      result += String.fromCharCode(byte);
    }
    return result.trim();
  }

  private static extractAlbumArt(view: DataView, offset: number, size: number): string {
    // This is a simplified implementation
    // In a real implementation, you'd need to properly parse the APIC frame
    // and extract the image data, then convert it to a data URL
    return '';
  }

  private static getGenreName(index: number): string {
    const genres = [
      'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk',
      'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies',
      'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno',
      'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks',
      'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal',
      'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental',
      'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
      'Alternative Rock', 'Bass', 'Soul', 'Punk', 'Space',
      'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic',
      'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic',
      'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy',
      'Cult', 'Gangsta', 'Top 40', 'Christian Rap', 'Pop/Funk',
      'Jungle', 'Native US', 'Cabaret', 'New Wave', 'Psychadelic',
      'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk',
      'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll',
      'Hard Rock'
    ];
    
    return genres[index] || 'Unknown';
  }

  static async getDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
      
      audio.src = url;
    });
  }
}
