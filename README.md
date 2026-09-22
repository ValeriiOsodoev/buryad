# Buryad

Практический тренажёр бытового бурятского языка: частотные фразы, 50 базовых глаголов, интервальное повторение, YouTube-аудирование и аккаунты с синхронизацией прогресса.

Домен: `https://buryad.buuzoed.dev`.


## Feedback / GitHub Issues

Публичная страница обратной связи: `https://buryad.buuzoed.dev/feedback`.

- список Issues доступен всем пользователям и загружается из публичного GitHub API;
- создавать Issue через сайт могут только авторизованные пользователи Buryad;
- email пользователя в публичный Issue не передаётся;
- backend ограничивает частоту отправки и создаёт Issue через GitHub REST API;
- секрет никогда не попадает во frontend.

Для включения создания Issues добавьте repository secret:

```
BURYAD_ISSUES_TOKEN
```

Используйте fine-grained GitHub Personal Access Token с доступом только к репозиторию `ValeriiOsodoev/buryad` и правом **Issues: Read and write**. CI передаёт секрет на сервер через SSH в runtime `.env`; в Docker image и артефакты он не попадает.


## Brand

Публичное имя проекта: **BURYAД**. Произносится как «Буряд».

- wordmark / логотип: `BURYAД`;
- технический slug для URL, репозитория и хэндлов: `buryad`;
- подпись: **«говори по-бурятски»**.

Смешанное написание используется как визуальный знак, а ASCII-форма `buryad` — там, где кириллица неудобна или недоступна.


## Visual asset generation

The learner-facing app never receives an OpenAI API key. Immersion visuals are generated offline from `web/data/image-manifest.json` and deployed as static assets.

```bash
python -m pip install -r requirements-tools.txt
export OPENAI_API_KEY=...
python scripts/generate_immersion_images.py --limit 3
```

The current image model configured by the pipeline is `gpt-image-2`. Review generated teaching images before committing them: the depicted object/action must be unambiguous and there must be no text inside the image.
