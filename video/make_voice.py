import subprocess, json
LINES = {
 "title":   "Свет из космоса. По запросу.",
 "problem": "Представьте регионы, где нет постоянного электричества. Люди вынуждены жечь дизель и уголь, и дышать этим воздухом.",
 "solution":"Мы предлагаем орбитальные спутники-отражатели. Никакого угля. Никаких выбросов. Только чистая энергия Солнца, пойманная прямо в космосе.",
 "app":     "Всё работает через простое приложение. Выберите на карте участок, укажите время, оплатите. И спутник повернёт зеркала на ваш дом.",
 "effect":  "Это технология будущего, с нулевым углеродным следом. Безопасный, чистый и доступный свет. По требованию.",
 "outro":   "Свет для каждого дома.",
}
durs = {}
for k, s in LINES.items():
    subprocess.run(["espeak-ng", "-v", "ru+m3", "-s", "135", "-p", "38", "-g", "6", "-w", f"audio/{k}_raw.wav", s], check=True)
    # warm, deeper, slightly reverberant broadcast-style voice
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"audio/{k}_raw.wav",
        "-af", "asetrate=22050*0.94,aresample=44100,atempo=1.0,highpass=f=70,lowpass=f=6500,"
               "equalizer=f=140:t=q:w=1:g=5,equalizer=f=3000:t=q:w=1:g=-3,"
               "acompressor=threshold=-20dB:ratio=3,aecho=0.8:0.5:45|90:0.18|0.1,volume=1.6",
        "-ar", "44100", "-ac", "2", f"audio/{k}.wav"], check=True)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"audio/{k}.wav"]))
    durs[k] = d; print(k, round(d, 2))
json.dump(durs, open("audio/durations.json", "w"))
