import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db/db';
import type { Criterion, Rating, StudyOption, TimelineEvent } from '@/db/schemas';
import { ratingMap, scoreOptions, type OptionScore, type RatingMap } from './logic/matrix';

export interface CompassData {
  options: StudyOption[];
  optionMap: Map<string, StudyOption>;
  criteria: Criterion[];
  ratings: Rating[];
  map: RatingMap;
  scores: OptionScore[];
  scoreMap: Map<string, OptionScore>;
  timeline: TimelineEvent[];
}

export function useCompassData(): CompassData | undefined {
  const options = useLiveQuery(() => db.studyOptions.orderBy('order').toArray(), []);
  const criteria = useLiveQuery(() => db.criteria.orderBy('order').toArray(), []);
  const ratings = useLiveQuery(() => db.ratings.toArray(), []);
  const timeline = useLiveQuery(() => db.timeline.toArray(), []);
  return useMemo(() => {
    if (!options || !criteria || !ratings || !timeline) return undefined;
    const scores = scoreOptions({ options, criteria, ratings });
    return {
      options,
      optionMap: new Map(options.map((o) => [o.id, o])),
      criteria,
      ratings,
      map: ratingMap(ratings),
      scores,
      scoreMap: new Map(scores.map((s) => [s.optionId, s])),
      timeline,
    };
  }, [options, criteria, ratings, timeline]);
}
