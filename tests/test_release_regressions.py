"""Regression checks for failures that previously blocked usable releases."""

import ast
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_python_sources_compile_before_deploy():
    for folder in ("app", "scripts", "tests"):
        for path in (ROOT / folder).rglob("*.py"):
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def test_browser_modules_have_valid_syntax():
    for path in (ROOT / "web/js").glob("*.js"):
        result = subprocess.run(
            ["node", "--check", str(path)], capture_output=True, text=True, check=False
        )
        assert result.returncode == 0, f"{path}: {result.stderr}"


def test_answer_matching_handles_single_and_multiple_expected_answers():
    script = """
        import assert from 'node:assert/strict';
        import {answerMatches} from './web/js/normalize.js';
        assert.equal(answerMatches('Тиимэ!', 'Тиимэ.'), true);
        assert.equal(answerMatches('Тиимэ!', ['Тиимэ.', 'Үгы.']), true);
        assert.equal(answerMatches('Үгы.', 'Тиимэ.'), false);
        assert.equal(answerMatches('муноо', ['Мүнөө']), true);
        assert.equal(answerMatches('', []), false);
    """
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT, capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stderr
