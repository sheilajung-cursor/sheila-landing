import { useCallback, useEffect, useState } from "react";
import { Check, GitBranch, Loader2 } from "lucide-react";

type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "link"; text: string; href: string };

type Block =
  | { kind: "paragraph"; inlines: Inline[] }
  | { kind: "listItem"; inlines: Inline[] }
  | { kind: "image"; src: string; alt: string };

type Phase = "boot" | "prompt" | "reading" | "streaming" | "done";

// How many "characters" an image consumes in the stream. Holds the stream
// while the photo sharpens in, like an AI image finishing generation.
const IMAGE_STREAM_COST = 32;

const response: Block[] = [
  {
    kind: "paragraph",
    inlines: [
      { kind: "text", text: "Sheila Jung is the " },
      { kind: "strong", text: "Regional Director, AI Deployment at Cursor" },
      { kind: "text", text: ", based in San Francisco, CA." },
    ],
  },
  { kind: "image", src: "/headshot.png", alt: "Sheila Jung" },
  {
    kind: "paragraph",
    inlines: [
      {
        kind: "text",
        text: "She's helping enterprise software engineering teams get business value out of Cursor. Before Cursor, she held GTM leadership roles at Retool and GoodData.",
      },
    ],
  },
  {
    kind: "paragraph",
    inlines: [{ kind: "text", text: "You can find her here:" }],
  },
  {
    kind: "listItem",
    inlines: [
      {
        kind: "link",
        text: "linkedin.com/in/sheilajung",
        href: "https://www.linkedin.com/in/sheilajung/",
      },
    ],
  },
];

const blockLength = (block: Block): number => {
  switch (block.kind) {
    case "image":
      return IMAGE_STREAM_COST;
    case "paragraph":
    case "listItem":
      return block.inlines.reduce((sum, inline) => sum + inline.text.length, 0);
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
};

const TOTAL_CHARS = response.reduce((sum, block) => sum + blockLength(block), 0);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mentionClass =
  "rounded bg-[#222] px-1.5 py-0.5 font-mono text-[11px] text-[#b0b0b0] hover:bg-[#2a2a2a] hover:text-[#d4d4d4] transition-colors";

const InlineSpan = ({ inline, visible }: { inline: Inline; visible: number }) => {
  if (visible <= 0) return null;
  const text = inline.text.slice(0, visible);
  switch (inline.kind) {
    case "text":
      return <>{text}</>;
    case "strong":
      return <strong className="font-semibold text-[#f0f0f0]">{text}</strong>;
    case "link":
      return (
        <a
          href={inline.href}
          target="_blank"
          rel="noopener noreferrer"
          className={mentionClass}
        >
          {text}
        </a>
      );
    default: {
      const _exhaustive: never = inline;
      return _exhaustive;
    }
  }
};

const Caret = () => (
  <span
    aria-hidden="true"
    className="caret-blink ml-px inline-block h-[1em] w-[7px] translate-y-[0.15em] bg-[#d6d6d6]"
  />
);

const StreamedBlock = ({
  block,
  visible,
  showCaret,
}: {
  block: Block;
  visible: number;
  showCaret: boolean;
}) => {
  if (visible <= 0) return null;

  if (block.kind === "image") {
    return (
      <div className="my-3 h-40 w-40 overflow-hidden rounded-lg sm:my-4 sm:h-44 sm:w-44">
        <img
          src={block.src}
          alt={block.alt}
          width={176}
          height={176}
          className="image-reveal h-full w-full object-cover object-[center_15%] grayscale"
        />
      </div>
    );
  }

  let offset = 0;
  const inlines = block.inlines.map((inline, index) => {
    const start = offset;
    offset += inline.text.length;
    return <InlineSpan key={index} inline={inline} visible={visible - start} />;
  });

  if (block.kind === "listItem") {
    return (
      <p className="my-1 pl-4">
        <span className="mr-2 text-[#6b6b6b]">•</span>
        {inlines}
        {showCaret && <Caret />}
      </p>
    );
  }

  return (
    <p className="my-3 first:mt-0">
      {inlines}
      {showCaret && <Caret />}
    </p>
  );
};

const Home = () => {
  const [phase, setPhase] = useState<Phase>("boot");
  const [charCount, setCharCount] = useState(0);

  const finish = useCallback(() => {
    setCharCount(TOTAL_CHARS);
    setPhase("done");
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) finish();
  }, [finish]);

  // Warm the browser cache before the stream reaches the image block, so the
  // photo paints the moment its <img> mounts instead of trailing the reveal.
  useEffect(() => {
    for (const block of response) {
      if (block.kind === "image") new Image().src = block.src;
    }
  }, []);

  useEffect(() => {
    const delays: Partial<Record<Phase, { next: Phase; ms: number }>> = {
      boot: { next: "prompt", ms: 400 },
      prompt: { next: "reading", ms: 700 },
      reading: { next: "streaming", ms: 900 },
    };
    const step = delays[phase];
    if (!step) return;
    const timer = setTimeout(() => setPhase(step.next), step.ms);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "streaming") return;
    const interval = setInterval(() => {
      setCharCount((count) => Math.min(count + 2 + Math.floor(Math.random() * 3), TOTAL_CHARS));
    }, 24);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "streaming" && charCount >= TOTAL_CHARS) setPhase("done");
  }, [phase, charCount]);

  const skip = () => {
    if (phase !== "done") finish();
  };

  const showToolCall = phase === "reading" || phase === "streaming" || phase === "done";

  // Index of the last block with any visible content; the caret lives there.
  let activeBlockIndex = -1;
  {
    let offset = 0;
    response.forEach((block, index) => {
      if (charCount > offset) activeBlockIndex = index;
      offset += blockLength(block);
    });
  }

  const renderTranscript = ({ animated }: { animated: boolean }) => {
    const promptVisible = !animated || phase !== "boot";
    const toolCallVisible = !animated || showToolCall;
    const spinning = animated && phase === "reading";
    let blockOffset = 0;

    return (
      <>
        {promptVisible && (
          <div
            className={`${animated ? "animate-fade-in " : ""}rounded-lg border border-[#333] bg-[#1e1e1e] px-3 py-2.5 text-[#d6d6d6]`}
          >
            who is sheila jung?
          </div>
        )}

        {toolCallVisible && (
          <div
            className={`${animated ? "animate-fade-in " : ""}mt-4 flex items-center gap-2 text-xs text-[#8a8a8a]`}
          >
            {spinning ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Check size={13} className="text-[#4ec9b0]" aria-hidden="true" />
            )}
            <span>Read</span>
            <span className={mentionClass}>about.md</span>
          </div>
        )}

        <div className="mt-4">
          {response.map((block, index) => {
            const start = blockOffset;
            blockOffset += blockLength(block);
            return (
              <StreamedBlock
                key={index}
                block={block}
                visible={animated ? charCount - start : blockLength(block)}
                showCaret={animated && phase === "streaming" && index === activeBlockIndex}
              />
            );
          })}
        </div>
      </>
    );
  };

  return (
    <main
      className="flex h-svh items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-3 antialiased sm:py-8"
      onClick={skip}
    >
      <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#2b2b2b] bg-[#161616] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        {/* Title bar */}
        <div className="relative flex h-9 shrink-0 items-center border-b border-[#262626] bg-[#1c1c1c] px-4">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 text-xs text-[#8a8a8a]">
            Cursor
          </span>
        </div>

        {/* Chat area: the window stays put; on overflow this pane scrolls
            with native (iOS rubber-band) behavior instead of the page. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3 text-sm leading-relaxed text-[#c9c9c9] sm:py-4">
          {/* Full response for screen readers; the animated copy is decorative. */}
          <div className="sr-only">
            Sheila Jung is the Regional Director, AI Deployment at Cursor,
            based in San Francisco, CA. She&apos;s helping enterprise software
            engineering teams get business value out of Cursor. Before Cursor,
            she held GTM leadership roles at Retool and GoodData. Find her at{" "}
            <a href="https://www.linkedin.com/in/sheilajung/">
              linkedin.com/in/sheilajung
            </a>
            .
          </div>

          <div className="relative" aria-hidden={phase !== "done"}>
            {/* Invisible copy of the finished transcript reserves the final
                height, so the window doesn't grow while the text streams. */}
            <div className="invisible" aria-hidden="true">
              {renderTranscript({ animated: false })}
            </div>
            <div className="absolute inset-0">{renderTranscript({ animated: true })}</div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex shrink-0 items-center border-t border-[#262626] bg-[#1c1c1c] px-4 py-1.5 text-[11px] text-[#6b6b6b]">
          <span className="flex items-center gap-1.5">
            <GitBranch size={11} aria-hidden="true" />
            main
          </span>
        </div>
      </div>
    </main>
  );
};

export default Home;
