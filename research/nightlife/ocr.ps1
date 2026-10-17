param([string]$ImagePath, [switch]$Capabilities)
# Local Windows OCR only. Full recognition is emitted to a parent process, not saved.
# The experiment runner keeps only bounded factual matches, never this full text.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
    $null = [Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime]
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))
    if ($null -eq $engine) { throw 'English Windows OCR language is unavailable.' }
    if ($Capabilities) {
        @{ engine = 'Windows.Media.Ocr'; language = $engine.RecognizerLanguage.LanguageTag; maxImageDimension = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension; localOnly = $true } | ConvertTo-Json -Compress
        exit 0
    }
    if (-not $ImagePath) { throw 'ImagePath is required.' }
    $resolved = (Resolve-Path -LiteralPath $ImagePath).Path
    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
    $null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType=WindowsRuntime]
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    function Await-OcrOperation($Operation, [Type]$ResultType) {
        $task = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
        if (-not $task.Wait(30000)) { throw 'Windows OCR operation timed out.' }
        return $task.GetAwaiter().GetResult()
    }
    $file = Await-OcrOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resolved)) ([Windows.Storage.StorageFile])
    $stream = Await-OcrOperation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
        $decoder = Await-OcrOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await-OcrOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $gray = [Windows.Graphics.Imaging.SoftwareBitmap]::Convert($bitmap, [Windows.Graphics.Imaging.BitmapPixelFormat]::Gray8)
        try {
            $result = Await-OcrOperation ($engine.RecognizeAsync($gray)) ([Windows.Media.Ocr.OcrResult])
            @{ engine = 'Windows.Media.Ocr'; language = $engine.RecognizerLanguage.LanguageTag; width = $gray.PixelWidth; height = $gray.PixelHeight; text = $result.Text; lines = @($result.Lines | ForEach-Object { @{ text = $_.Text; words = @($_.Words | ForEach-Object { @{ text = $_.Text; x = $_.BoundingRect.X; y = $_.BoundingRect.Y; width = $_.BoundingRect.Width; height = $_.BoundingRect.Height } }) } }) } | ConvertTo-Json -Depth 7 -Compress
        } finally { $gray.Dispose(); $bitmap.Dispose() }
    } finally { $stream.Dispose() }
} catch {
    @{ error = 'LOCAL_OCR_FAILED'; message = $_.Exception.Message } | ConvertTo-Json -Compress
    exit 1
}
