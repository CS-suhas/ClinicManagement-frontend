"use client";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function LandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/doctors?q=${encodeURIComponent(q)}` : "/doctors");
  };

  return (
    <search className="contents">
      <form
        action="/doctors"
        method="get"
        onSubmit={submit}
        className="lp-search"
      >
        <MagnifyingGlassIcon
          aria-hidden="true"
          width={24}
          height={24}
          className="lp-searchIcon"
        />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Doctor, specialty or place"
          aria-label="Search doctors by name, specialty or place"
          autoComplete="off"
          className="lp-searchInput"
        />
        <button type="submit" className="lp-btn lp-primary lp-searchBtn">
          Find doctors
        </button>
      </form>
    </search>
  );
}
