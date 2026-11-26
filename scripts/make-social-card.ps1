<#
.SYNOPSIS
    Builds the LinkedIn-optimised social card (1200 x 627 px, 1.91:1) from the
    master brand cover.

.DESCRIPTION
    LinkedIn link previews (the card shown when a URL is pasted into a post)
    render at a 1.91:1 aspect ratio and crop anything taller or narrower. The
    master cover (pics-sources/BRIG2.jpg, 3072 x 2048 = 3:2) loses roughly 11 %
    of its height on each side when cropped, which cuts the tagline and the
    "Built by" credit.

    This script therefore RECOMPOSES the master artwork instead of cropping it:

      * canvas          1200 x 627 px (LinkedIn feed), light brand wash whose
                        tones are sampled from the cover's own background
      * left            illustration block (chart + boardroom) lifted from the
                        master and merged with a darken blend, so the cover's
                        light-blue background and white glow vanish into the
                        wash while the navy/teal artwork is preserved exactly
      * right           BRIG wordmark, "BOARD RISK & INSIGHTS GENERATOR",
                        the teal rule, the two-line tagline and the author
                        credit, all lifted from the master so the original
                        typography is preserved (no font substitution)

    The text blocks are extracted with a luminance-based alpha key: the light
    cover background becomes transparent, the navy/teal lettering stays solid,
    so each block can sit on the new canvas without a visible rectangle.

    The master cover itself stays untouched — it is still used by the landing
    page hero, the README and the GitHub social preview.

.EXAMPLE
    pwsh -File scripts/make-social-card.ps1

.EXAMPLE
    pwsh -File scripts/make-social-card.ps1 -Quality 90
#>
param(
    [string]$Source = (Join-Path (Split-Path -Parent $PSScriptRoot) 'pics-sources/BRIG2.jpg'),
    [string]$Destination = (Join-Path (Split-Path -Parent $PSScriptRoot) 'public/img/brig-preview-linkedin.jpg'),
    [ValidateRange(40, 100)]
    [int]$Quality = 88
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# LinkedIn large-image link preview: 1200 x 627 px (1.91:1).
$cardWidth = 1200
$cardHeight = 627

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$master = [System.Drawing.Bitmap]::new($sourcePath)
$masterWidth = $master.Width      # 3072
$masterHeight = $master.Height    # 2048

# Brand palette sampled from the master cover's own background. Used as a flat
# base so the canvas is never left transparent and as a fallback tone.
$backgroundBase = [System.Drawing.Color]::FromArgb(0xE8, 0xF5, 0xFE)

function New-HighQualityGraphics([System.Drawing.Bitmap]$Bitmap) {
    $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    return $graphics
}

# Master coordinates are expressed as fractions of the master image, so the
# numbers below stay valid if the artwork is ever re-exported at another size.
function New-MasterRect([double]$X0, [double]$Y0, [double]$X1, [double]$Y1) {
    $x = [int][Math]::Round($X0 * $masterWidth)
    $y = [int][Math]::Round($Y0 * $masterHeight)
    $w = [int][Math]::Round(($X1 - $X0) * $masterWidth)
    $h = [int][Math]::Round(($Y1 - $Y0) * $masterHeight)
    return [System.Drawing.Rectangle]::new($x, $y, $w, $h)
}

<#
    Luminance alpha key: pixels at or above -NearWhite become fully
    transparent, pixels at or below -Solid stay fully opaque, and the range in
    between is feathered so anti-aliased glyph edges stay smooth.
#>
function Set-KeyedAlpha([System.Drawing.Bitmap]$Bitmap, [int]$NearWhite = 237, [int]$Solid = 200) {
    $rect = [System.Drawing.Rectangle]::new(0, 0, $Bitmap.Width, $Bitmap.Height)
    $data = $Bitmap.LockBits(
        $rect,
        [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $stride = $data.Stride
        $bytes = [byte[]]::new($stride * $Bitmap.Height)
        [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
        $span = [double]($NearWhite - $Solid)
        for ($y = 0; $y -lt $Bitmap.Height; $y++) {
            $row = $y * $stride
            for ($x = 0; $x -lt $Bitmap.Width; $x++) {
                $i = $row + $x * 4
                # Format32bppArgb is little-endian BGRA.
                $luminance = (299 * $bytes[$i + 2] + 587 * $bytes[$i + 1] + 114 * $bytes[$i]) / 1000
                $alpha = ($NearWhite - $luminance) * 255 / $span
                if ($alpha -ge 255) { $bytes[$i + 3] = 255 }
                elseif ($alpha -le 0) { $bytes[$i + 3] = 0 }
                else { $bytes[$i + 3] = [byte][Math]::Round($alpha) }
            }
        }
        [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    }
    finally {
        $Bitmap.UnlockBits($data)
    }
}

<#
    Darken composite: every artwork pixel keeps whichever channel value is
    darker — itself or the card pixel already underneath. The cover's light-blue
    background and its white glow are lighter than the card wash, so they simply
    disappear, while the navy/teal artwork (always darker) is preserved exactly.
    No feathering is needed: the crop boundary is invisible by construction.
#>
function Merge-ArtworkDarken(
    [System.Drawing.Bitmap]$Artwork,
    [System.Drawing.Bitmap]$Target,
    [int]$Left,
    [int]$Top) {

    $artRect = [System.Drawing.Rectangle]::new(0, 0, $Artwork.Width, $Artwork.Height)
    $targetRect = [System.Drawing.Rectangle]::new(0, 0, $Target.Width, $Target.Height)
    $artData = $Artwork.LockBits(
        $artRect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $targetData = $Target.LockBits(
        $targetRect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $artBytes = [byte[]]::new($artData.Stride * $Artwork.Height)
        [System.Runtime.InteropServices.Marshal]::Copy($artData.Scan0, $artBytes, 0, $artBytes.Length)
        $targetBytes = [byte[]]::new($targetData.Stride * $Target.Height)
        [System.Runtime.InteropServices.Marshal]::Copy($targetData.Scan0, $targetBytes, 0, $targetBytes.Length)

        for ($y = 0; $y -lt $Artwork.Height; $y++) {
            $artRow = $y * $artData.Stride
            $targetRow = ($Top + $y) * $targetData.Stride
            for ($x = 0; $x -lt $Artwork.Width; $x++) {
                $a = $artRow + $x * 4
                $t = $targetRow + ($Left + $x) * 4
                for ($channel = 0; $channel -lt 3; $channel++) {
                    if ($targetBytes[$t + $channel] -lt $artBytes[$a + $channel]) {
                        $artBytes[$a + $channel] = $targetBytes[$t + $channel]
                    }
                }
                $artBytes[$a + 3] = 255
            }
        }

        [System.Runtime.InteropServices.Marshal]::Copy($artBytes, 0, $artData.Scan0, $artBytes.Length)
    }
    finally {
        $Artwork.UnlockBits($artData)
        $Target.UnlockBits($targetData)
    }
}

# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------
$canvas = [System.Drawing.Bitmap]::new($cardWidth, $cardHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$canvasGraphics = New-HighQualityGraphics $canvas
try {
    # ---------------------------------------------------------------------
    # Background: a light brand wash whose tones are sampled from the master
    # cover's own background at the artwork's edges, so the darkened artwork
    # composite below meets it without a seam.
    # ---------------------------------------------------------------------
    $art = New-MasterRect 0.200 0.030 0.780 0.535

    $canvasGraphics.Clear($backgroundBase)

    $backgroundRect = [System.Drawing.Rectangle]::new(0, 0, $cardWidth, $cardHeight)
    $backgroundBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $backgroundRect,
        $backgroundBase,
        $backgroundBase,
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    $colorBlend = [System.Drawing.Drawing2D.ColorBlend]::new(5)
    # Positions are canvas fractions matching the master's background tones.
    $colorBlend.Positions = [single[]](0.000, 0.285, 0.414, 0.714, 1.000)
    $colorBlend.Colors = [System.Drawing.Color[]]@(
        [System.Drawing.Color]::FromArgb(0xCF, 0xE9, 0xFD),
        [System.Drawing.Color]::FromArgb(0xD5, 0xEC, 0xFE),
        [System.Drawing.Color]::FromArgb(0xE2, 0xF3, 0xFD),
        [System.Drawing.Color]::FromArgb(0xEE, 0xF7, 0xFE),
        [System.Drawing.Color]::FromArgb(0xE3, 0xF2, 0xFE)
    )
    $backgroundBrush.InterpolationColors = $colorBlend
    try {
        $canvasGraphics.FillRectangle($backgroundBrush, $backgroundRect)
    }
    finally {
        $backgroundBrush.Dispose()
    }

    # ---------------------------------------------------------------------
    # Left: illustration (chart + boardroom). Generous bleed keeps the green
    # swoosh and the conference table inside the crop; the darken merge makes
    # the crop's own background disappear into the card.
    # ---------------------------------------------------------------------
    $artWidth = 440
    $artHeight = [int][Math]::Round($artWidth * $art.Height / $art.Width)
    $artLeft = 48
    $artTop = [int][Math]::Round(($cardHeight - $artHeight) / 2)

    $artBitmap = [System.Drawing.Bitmap]::new(
        $artWidth, $artHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $artGraphics = New-HighQualityGraphics $artBitmap
    try {
        $artGraphics.Clear([System.Drawing.Color]::Transparent)
        $artGraphics.DrawImage(
            $master,
            [System.Drawing.Rectangle]::new(0, 0, $artWidth, $artHeight),
            $art.X,
            $art.Y,
            $art.Width,
            $art.Height,
            [System.Drawing.GraphicsUnit]::Pixel)
    }
    finally {
        $artGraphics.Dispose()
    }
    Merge-ArtworkDarken $artBitmap $canvas $artLeft $artTop
    $canvasGraphics.DrawImage($artBitmap, $artLeft, $artTop)
    $artBitmap.Dispose()

    # ---------------------------------------------------------------------
    # Right: typographic stack lifted from the master with a single scale
    # factor, so the wordmark, descriptor, tagline and credit keep their
    # original proportions and typography.
    # ---------------------------------------------------------------------
    $columnLeft = $artLeft + $artWidth + 44     # 532 px
    $columnWidth = 620                          # ends at 1152 px (48 px right margin)

    $wordmark = New-MasterRect 0.264 0.532 0.735 0.708
    $descriptor = New-MasterRect 0.152 0.705 0.848 0.790     # name line + teal rule
    $tagline = New-MasterRect 0.205 0.793 0.795 0.902        # two tagline lines
    $credit = New-MasterRect 0.055 0.903 0.345 0.952         # "Built by …"

    $scale = $columnWidth / $descriptor.Width

    $wordmarkHeight = [int][Math]::Round($wordmark.Height * $scale)
    $descriptorHeight = [int][Math]::Round($descriptor.Height * $scale)
    $taglineHeight = [int][Math]::Round($tagline.Height * $scale)
    $creditHeight = [int][Math]::Round($credit.Height * $scale)
    $wordmarkWidth = [int][Math]::Round($wordmark.Width * $scale)
    $taglineWidth = [int][Math]::Round($tagline.Width * $scale)
    $creditWidth = [int][Math]::Round($credit.Width * $scale)

    # Vertical rhythm taken from the master and scaled with the blocks.
    $gapWordmarkToDescriptor = [int][Math]::Round((0.705 - 0.708) * $masterHeight * $scale)
    $gapDescriptorToTagline = [int][Math]::Round((0.793 - 0.790) * $masterHeight * $scale)
    $gapTaglineToCredit = [int][Math]::Round((0.903 - 0.902) * $masterHeight * $scale)

    $stackHeight =
        $wordmarkHeight + $descriptorHeight + $taglineHeight + $creditHeight +
        $gapWordmarkToDescriptor + $gapDescriptorToTagline + $gapTaglineToCredit
    $stackTop = [int][Math]::Round(($cardHeight - $stackHeight) / 2)

    $descriptorTop = $stackTop + $wordmarkHeight + $gapWordmarkToDescriptor
    $taglineTop = $descriptorTop + $descriptorHeight + $gapDescriptorToTagline
    $creditTop = $taglineTop + $taglineHeight + $gapTaglineToCredit

    $blocks = @(
        @{ Rect = $wordmark;   Width = $wordmarkWidth;   Height = $wordmarkHeight;   Top = $stackTop }
        @{ Rect = $descriptor; Width = $columnWidth;     Height = $descriptorHeight; Top = $descriptorTop }
        @{ Rect = $tagline;    Width = $taglineWidth;    Height = $taglineHeight;    Top = $taglineTop }
        @{ Rect = $credit;     Width = $creditWidth;     Height = $creditHeight;     Top = $creditTop }
    )

    foreach ($block in $blocks) {
        $sourceRect = $block.Rect
        $blockBitmap = [System.Drawing.Bitmap]::new(
            $block.Width, $block.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $blockGraphics = New-HighQualityGraphics $blockBitmap
        try {
            $blockGraphics.Clear([System.Drawing.Color]::Transparent)
            $blockGraphics.DrawImage(
                $master,
                [System.Drawing.Rectangle]::new(0, 0, $block.Width, $block.Height),
                $sourceRect.X,
                $sourceRect.Y,
                $sourceRect.Width,
                $sourceRect.Height,
                [System.Drawing.GraphicsUnit]::Pixel)
        }
        finally {
            $blockGraphics.Dispose()
        }

        Set-KeyedAlpha $blockBitmap

        # Every block is centred inside the text column.
        $left = $columnLeft + [int][Math]::Round(($columnWidth - $block.Width) / 2)
        $canvasGraphics.DrawImage($blockBitmap, $left, $block.Top)
        $blockBitmap.Dispose()
    }

    # ---------------------------------------------------------------------
    # Save as a JPEG (LinkedIn's limit is 5 MB; this lands around 60 KB).
    # ---------------------------------------------------------------------
    $destinationPath = [System.IO.Path]::GetFullPath($Destination)
    $destinationDirectory = Split-Path -Parent $destinationPath
    if (-not (Test-Path -LiteralPath $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }

    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $encoderParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new(
        [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    try {
        $canvas.Save($destinationPath, $jpegCodec, $encoderParameters)
    }
    finally {
        $encoderParameters.Dispose()
    }

    $written = Get-Item -LiteralPath $destinationPath
    Write-Output ('[make-social-card] wrote {0} ({1} x {2}, {3:N0} KB, quality {4})' -f
        $destinationPath, $canvas.Width, $canvas.Height, ($written.Length / 1KB), $Quality)
}
finally {
    $canvasGraphics.Dispose()
    $canvas.Dispose()
    $master.Dispose()
}
