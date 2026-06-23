export type MovieRecommendation = {
  tmdbId:    string;
  title:     string;
  year:      number;
  rating:    number;    // TMDB vote_average (0–10)
  poster:    string;    // full TMDB poster URL
  runtime:   number;    // minutes
  genres:    string[];
  director:  string;
  cast:      string[];  // top-billed names
  overview:  string;
  reasoning: string;    // Claude's emotional reasoning for this pick
};
