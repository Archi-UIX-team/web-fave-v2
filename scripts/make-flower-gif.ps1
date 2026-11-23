param(
  [string]$Source = (Join-Path $PSScriptRoot "..\assets\images\fave-flower.png"),
  [string]$Destination = (Join-Path $PSScriptRoot "..\assets\images\fave-flower-sway.gif")
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class FlowerGifMaker {
  static void U16(BinaryWriter w, int value) { w.Write((byte)(value & 255)); w.Write((byte)((value >> 8) & 255)); }

  static byte[] Lzw(byte[] pixels) {
    const int clear = 256, end = 257;
    var output = new List<byte>();
    uint bits = 0; int bitCount = 0, codeSize = 9, next = 258;
    Action<int> emit = code => {
      bits |= ((uint)code) << bitCount; bitCount += codeSize;
      while (bitCount >= 8) { output.Add((byte)(bits & 255)); bits >>= 8; bitCount -= 8; }
    };
    var dictionary = new Dictionary<int,int>(4096);
    emit(clear);
    int prefix = pixels[0];
    for (int i = 1; i < pixels.Length; i++) {
      int suffix = pixels[i], key = (prefix << 8) | suffix, found;
      if (dictionary.TryGetValue(key, out found)) { prefix = found; continue; }
      emit(prefix);
      if (next < 4096) {
        dictionary[key] = next++;
        if (next > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clear); dictionary.Clear(); codeSize = 9; next = 258;
      }
      prefix = suffix;
    }
    emit(prefix); emit(end);
    if (bitCount > 0) output.Add((byte)(bits & 255));
    return output.ToArray();
  }

  static byte[] Indexed(Bitmap frame) {
    var rect = new Rectangle(0,0,frame.Width,frame.Height);
    var data = frame.LockBits(rect,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
    var bgra = new byte[Math.Abs(data.Stride) * frame.Height];
    Marshal.Copy(data.Scan0,bgra,0,bgra.Length); frame.UnlockBits(data);
    var indexed = new byte[frame.Width * frame.Height];
    int p = 0;
    for (int y=0; y<frame.Height; y++) for (int x=0; x<frame.Width; x++) {
      int i = y * data.Stride + x * 4;
      if (bgra[i+3] < 96) indexed[p++] = 0;
      else {
        int value = ((bgra[i+2] >> 5) << 5) | ((bgra[i+1] >> 5) << 2) | (bgra[i] >> 6);
        indexed[p++] = (byte)(value == 0 ? 1 : value);
      }
    }
    return indexed;
  }

  static void Frame(BinaryWriter w, Bitmap bitmap, int delay) {
    w.Write((byte)0x21); w.Write((byte)0xF9); w.Write((byte)4); w.Write((byte)0x09);
    U16(w,delay); w.Write((byte)0); w.Write((byte)0);
    w.Write((byte)0x2C); U16(w,0); U16(w,0); U16(w,bitmap.Width); U16(w,bitmap.Height); w.Write((byte)0);
    w.Write((byte)8);
    var data = Lzw(Indexed(bitmap));
    for (int offset=0; offset<data.Length; offset+=255) {
      int count = Math.Min(255,data.Length-offset); w.Write((byte)count); w.Write(data,offset,count);
    }
    w.Write((byte)0);
  }

  public static void Create(string sourcePath, string destinationPath) {
    const int width=540, height=594, frames=30, delay=20;
    using (var source = new Bitmap(sourcePath))
    using (var stream = File.Open(destinationPath,FileMode.Create))
    using (var w = new BinaryWriter(stream)) {
      w.Write(System.Text.Encoding.ASCII.GetBytes("GIF89a")); U16(w,width); U16(w,height);
      w.Write((byte)0xF7); w.Write((byte)0); w.Write((byte)0);
      for (int i=0; i<256; i++) {
        if (i==0) { w.Write((byte)0); w.Write((byte)0); w.Write((byte)0); continue; }
        int r=(i>>5)&7, g=(i>>2)&7, b=i&3;
        w.Write((byte)(r*255/7)); w.Write((byte)(g*255/7)); w.Write((byte)(b*255/3));
      }
      w.Write((byte)0x21); w.Write((byte)0xFF); w.Write((byte)11);
      w.Write(System.Text.Encoding.ASCII.GetBytes("NETSCAPE2.0"));
      w.Write((byte)3); w.Write((byte)1); U16(w,0); w.Write((byte)0);

      for (int f=0; f<frames; f++) {
        double phase = 2*Math.PI*f/frames;
        float angle=(float)(Math.Sin(phase)*1.55), dx=(float)(Math.Sin(phase+.35)*2.4), dy=(float)(Math.Cos(phase)*2.5);
        float scale=(float)(.997+(Math.Sin(phase-.6)+1)*.002);
        using (var frame = new Bitmap(width,height,PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(frame)) {
          g.Clear(Color.Transparent); g.InterpolationMode=InterpolationMode.HighQualityBicubic; g.SmoothingMode=SmoothingMode.HighQuality;
          float px=width*.86f, py=height*.12f;
          g.TranslateTransform(px+dx,py+dy); g.RotateTransform(angle); g.ScaleTransform(scale,scale); g.TranslateTransform(-px,-py);
          g.DrawImage(source,new RectangleF(0,0,width,height));
          Frame(w,frame,delay);
        }
      }
      w.Write((byte)0x3B);
    }
  }
}
'@

$sourcePath = [System.IO.Path]::GetFullPath($Source)
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
[FlowerGifMaker]::Create($sourcePath,$destinationPath)
Write-Output $destinationPath
