# LMS Story Generation Instructions

Use this file as the default brief for any new learner stories created in this workspace.

## Goal

Create self-contained Chinese mini-stories that are readable at about 95% comprehensibility for the learner's current vocabulary level.

Plot completeness is not the goal.

If a scene from *The Legendary Moonlight Sculptor* is too hard to retell clearly at the learner's current level, simplify it, narrow it, or stop earlier.

## Source Rule

- New stories should still be drawn from the LMS source text.
- Stories do not need to preserve every event from the novel.
- Prefer one clean emotional arc over broad plot coverage.
- Prefer short, self-contained episodes that make sense on their own.

## Vocabulary Rule

- Use the provided learner word list as the main vocabulary source.
- In this workspace, `Known.txt` is the default baseline unless the user provides a newer list.
- Target about 95% known vocabulary.
- Introduce only a small number of new words when they are truly needed.
- When the learner knows more words later, use the larger list and allow richer stories.
- Repeat useful words instead of rotating synonyms.

## Length

- Each story should usually be between 400 and 600 Chinese words.
- A story should also be short enough to work well in a sentence-by-sentence reader.
- Prefer 25 to 45 short sentences over a few long dense paragraphs.

## Required Story Shape

Every story must include:

1. External situation: a simple, concrete scenario.
2. Internal struggle: a fear, desire, or conflict inside the character.
3. Misbelief or limiting belief: what the character believes incorrectly.
4. Escalation: the situation becomes harder and forces deeper tension.
5. Internal realization or shift.
6. Behavioral adaptation: the character changes what they do.
7. Outcome that reflects the internal change.

## Style

- Keep sentences short and readable.
- Use natural spoken Chinese when possible.
- Avoid literary phrasing and rare constructions.
- Keep the story engaging.
- Humorous, warm, or slightly unexpected turns are welcome.
- Prefer clarity over elegance.
- Prefer one clear point of view.
- Prefer concrete actions over abstract explanation.
- Avoid large casts of characters unless they are necessary.
- Avoid abrupt scene jumps that make a sentence-level reader harder to follow.

## Default Output Format

1. Title.
2. Source inspiration from LMS text.
3. Chinese story.
4. Pinyin only if the user asks for it.
5. English translation only if the user asks for it.
6. New words at the end when helpful.

## Reader App Fit

- Stories should be easy to split into one sentence at a time.
- Sentences should stand on their own without heavy pronoun ambiguity.
- Prefer explicit names over repeated unclear pronouns when needed for clarity.
- Keep dialogue short and easy to attribute.
- If a sentence would be confusing by itself in the app, rewrite it to be more self-contained.
- Reuse recurring vocabulary and sentence patterns so the app content feels consistent.

## Suggested Metadata For Saved Stories

When storing stories in local project files for later app use, include:

- `story_id`
- `title`
- `source_inspiration`
- `book`
- `chapter`
- `source_range`
- `target_level_note`
- `estimated_known_coverage`
- `new_word_count`
- `new_words`
- `sentences`
- optional `english_helper`

## Saved Story JSON Shape

For app-ready stories, prefer this JSON structure:

```json
{
  "story_id": "b01c01-sell-old-account",
  "title": "卖掉旧账号",
  "source_inspiration": "Book 1 Chapter 1",
  "book": 1,
  "chapter": 1,
  "source_range": "inspired by early family/account scenes",
  "target_level_note": "low-level self-contained family-pressure story",
  "estimated_known_coverage": 0.95,
  "new_word_count": 5,
  "new_words": [
    { "word": "照顾", "pinyin": "zhào gù", "gloss": "to take care of" }
  ],
  "sentences": [
    {
      "sentence_id": "b01c01-sell-old-account-s01",
      "chinese": "李贤家里一直没有很多钱。",
      "english_helper": "Lee Hyun's family has not had much money for a long time."
    }
  ]
}
```

Notes:

- `sentences` should be the main source for app import.
- Keep one full Chinese sentence per `sentences` item.
- `english_helper` should be short, learner-friendly, and aligned to the Chinese sentence.
- If token-level gloss data is added later, it can be attached per sentence without changing the story-level structure.

## Practical Note For Saved Project Files

If a story is likely to be imported into the reader later, prefer clean sentence boundaries and stable vocabulary over extra style.
