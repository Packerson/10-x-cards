import { useState } from "react";
import styles from "./SampleFlipCards.module.css";

const sampleCards = [
  {
    topic: "Python",
    question: "Co robi list comprehension?",
    answer:
      "Tworzy nową listę na podstawie iterowalnych danych i warunków, np. [x * 2 for x in range(5) if x % 2 == 0].",
  },
  {
    topic: "Python",
    question: "Czym różni się lista od krotki (tuple)?",
    answer: "Lista jest mutowalna, a krotka niemutowalna.",
  },
  {
    topic: "Python",
    question: "Co zwraca len() dla łańcucha?",
    answer: "Liczbę znaków w łańcuchu.",
  },
  {
    topic: "Python",
    question: "Jak działa operator in?",
    answer: "Sprawdza, czy element znajduje się w kolekcji (lista, string, set).",
  },
  {
    topic: "Python",
    question: "Co robi dict.get('key', default)?",
    answer: "Zwraca wartość klucza lub wartość domyślną, jeśli klucz nie istnieje.",
  },
  {
    topic: "Python",
    question: "Do czego służy enumerate()?",
    answer: "Zwraca pary (indeks, wartość) podczas iteracji po kolekcji.",
  },
  {
    topic: "Python",
    question: "Co oznacza *args w funkcji?",
    answer: "Pozwala przekazać dowolną liczbę argumentów pozycyjnych.",
  },
  {
    topic: "Python",
    question: "Co oznacza **kwargs w funkcji?",
    answer: "Pozwala przekazać dowolną liczbę argumentów nazwanych.",
  },
  {
    topic: "Python",
    question: "Jak działa list slicing?",
    answer: "Pozwala wycinać fragment listy, np. lista[1:4].",
  },
  {
    topic: "Python",
    question: "Co robi funkcja range(1, 5)?",
    answer: "Generuje liczby 1, 2, 3, 4.",
  },
];

export function SampleFlipCards() {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());

  const toggleCard = (index: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Zobacz jak działa fiszka</h2>
      <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
        Najedz myszką lub stuknij kartę, aby odwrócić fiszkę i zobaczyć odpowiedź.
      </p>
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sampleCards.map((card, index) => (
          <button
            key={`${card.topic}-${index}`}
            type="button"
            className={`${styles.flipCard} focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ${
              flipped.has(index) ? styles.isFlipped : ""
            }`}
            aria-pressed={flipped.has(index)}
            aria-label={`Przykładowa fiszka ${index + 1} z ${card.topic}`}
            onClick={() => toggleCard(index)}
          >
            <div className={styles.flipCardInner}>
              <div className={`${styles.flipCardFace} ${styles.flipCardFront}`}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.topic}</p>
                <h3 className="mt-2 text-sm font-semibold text-foreground">{card.question}</h3>
              </div>
              <div className={`${styles.flipCardFace} ${styles.flipCardBack}`}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Odpowiedź</p>
                <p className="mt-2 text-xs text-foreground">{card.answer}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
