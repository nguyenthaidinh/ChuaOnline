param(
    [string] $VoiceName = 'Microsoft An',
    [ValidateRange(-10, 10)] [int] $Rate = -1
)

# Run from the project root on Windows with System.Speech and the vi-VN voice installed.
# No account, API key, network TTS service or Windows voice-setting change is involved.
$projectDirectory = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $projectDirectory 'src/data/blessingCatalog.ts'
$artDirectory = Join-Path $projectDirectory 'artwork/audio-voice-v1'
$masterDirectory = Join-Path $artDirectory 'masters'
$blessingDirectory = Join-Path $projectDirectory 'public/assets/audio/blessings'
$ritualDirectory = Join-Path $projectDirectory 'public/assets/audio/rituals'

foreach ($directory in @($artDirectory, $masterDirectory, $blessingDirectory, $ritualDirectory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

Push-Location -LiteralPath $projectDirectory
try {
    $catalogJson = & node --experimental-strip-types --input-type=module -e 'import { BLESSING_CARDS, RITUAL_WISHES } from "./src/data/blessingCatalog.ts"; process.stdout.write(JSON.stringify({blessings: BLESSING_CARDS, rituals: RITUAL_WISHES}));'
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the canonical TypeScript catalog.' }
    $catalog = $catalogJson | ConvertFrom-Json
    $jobs = @()
    foreach ($card in $catalog.blessings) {
        $jobs += [pscustomobject]@{ id=$card.id; kind='blessing'; text=($card.title+'. '+$card.text).Normalize([Text.NormalizationForm]::FormC); output=(Join-Path $blessingDirectory ($card.id+'.mp3')) }
    }
    foreach ($property in $catalog.rituals.PSObject.Properties) {
        $jobs += [pscustomobject]@{ id=$property.Name; kind='ritual'; text=([string]$property.Value).Normalize([Text.NormalizationForm]::FormC); output=(Join-Path $ritualDirectory ($property.Name+'.mp3')) }
    }
    if ($catalog.blessings.Count -ne 20 -or $jobs.Count -ne 25) { throw 'Expected twenty blessings and five ritual wishes.' }
    $jobs | Select-Object id,kind,text | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $artDirectory 'script.json') -Encoding utf8

    Add-Type -AssemblyName System.Speech
    $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
        $speaker.SelectVoice($VoiceName)
        if ($speaker.Voice.Culture.Name -ne 'vi-VN') { throw 'Use an installed Vietnamese voice, not an English fallback.' }
        $speaker.Rate = $Rate
        $speaker.Volume = 100
        $format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(
            24000,
            [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
            [System.Speech.AudioFormat.AudioChannel]::Mono
        )

        $entries = @()
        foreach ($job in $jobs) {
            $master = Join-Path $masterDirectory ($job.kind+'-'+$job.id+'.wav')
            $speaker.SetOutputToWaveFile($master, $format)
            $speaker.Speak($job.text)
            $speaker.SetOutputToNull()
            # Keep the original WAV. Trim only leading/trailing near-silence, preserve
            # sentence pauses, and leave a short comfortable tail before encoding.
            $filters = 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB,areverse,apad=pad_dur=0.18,loudnorm=I=-19:LRA=7:TP=-2'
            & ffmpeg -hide_banner -loglevel error -y -i $master -af $filters -ar 24000 -ac 1 -c:a libmp3lame -b:a 64k $job.output
            if ($LASTEXITCODE -ne 0) { throw ('Audio encoding failed: '+$job.id) }
            $probeJson = & ffprobe -v error -show_entries 'format=duration:stream=codec_name,sample_rate,channels' -of json $job.output
            if ($LASTEXITCODE -ne 0) { throw ('Audio probing failed: '+$job.id) }
            $probe = $probeJson | ConvertFrom-Json
            $duration = [double]::Parse($probe.format.duration, [Globalization.CultureInfo]::InvariantCulture)
            if ($duration -lt 1 -or $duration -gt 30) { throw ('Unexpected speech duration: '+$job.id) }
            $outputRelative = [IO.Path]::GetRelativePath($projectDirectory, $job.output).Replace('\','/')
            $masterRelative = [IO.Path]::GetRelativePath($projectDirectory, $master).Replace('\','/')
            $entries += [pscustomobject]@{
                id=$job.id; kind=$job.kind; text=$job.text
                file=$outputRelative; master=$masterRelative
                sha256=(Get-FileHash -LiteralPath $job.output -Algorithm SHA256).Hash.ToLowerInvariant()
                masterSha256=(Get-FileHash -LiteralPath $master -Algorithm SHA256).Hash.ToLowerInvariant()
                bytes=(Get-Item -LiteralPath $job.output).Length
                durationSeconds=[math]::Round($duration, 3)
                codec=$probe.streams[0].codec_name; sampleRate=[int]$probe.streams[0].sample_rate; channels=$probe.streams[0].channels
            }
            Write-Output ('Ready '+$job.kind+'/'+$job.id+' ('+$duration.ToString('F2',[Globalization.CultureInfo]::InvariantCulture)+' s)')
        }
        $manifest = [ordered]@{
            generator='Windows System.Speech.Synthesis.SpeechSynthesizer'
            voice=$speaker.Voice.Name; culture=$speaker.Voice.Culture.Name; rate=$Rate; volume=100
            source='src/data/blessingCatalog.ts'
            sourceSha256=(Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash.ToLowerInvariant()
            textNormalization='Unicode NFC'; codec='MP3'; sampleRate=24000; channels=1; bitrate=64000
            processing=$filters
            listeningNote='Offline Vietnamese synthesis; duration and signal checks are recorded separately. No claim of human listening.'
            reproduce='pwsh -File scripts/render-temple-voice.ps1'
            entries=$entries
        }
        $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $artDirectory 'manifest.json') -Encoding utf8
    } finally {
        $speaker.SetOutputToNull()
        $speaker.Dispose()
    }
} finally {
    Pop-Location
}
