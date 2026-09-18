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
GITHUB_ISSUES_TOKEN
```

Используйте fine-grained GitHub Personal Access Token с доступом только к репозиторию `ValeriiOsodoev/buryad` и правом **Issues: Read and write**. CI передаёт секрет на сервер через SSH в runtime `.env`; в Docker image и артефакты он не попадает.
