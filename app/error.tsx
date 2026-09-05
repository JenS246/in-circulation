'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-state"><h1>The edition could not be opened.</h1><p>Your source records have not been changed.</p><button className="solid-button" onClick={reset}>Try again</button></main>;
}
