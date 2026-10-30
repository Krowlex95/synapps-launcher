import { useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { Category, type CategoryFilter } from '../lib/types';

export function useApps(
  filter: CategoryFilter = Category.All,
  searchQuery = '',
  selectedCategories: Category[] = [],
  selectedDevelopers: string[] = [],
) {
  const appsMap = useAppStore((state) => state.apps);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const apps = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return [...appsMap.values()].filter(({ app }) => {
      const matchesFilter =
        filter === Category.All
          ? true
          : filter.startsWith('dev:')
            ? app.developerId === filter.slice(4)
            : app.category === filter;
      const matchesCategoryFilter =
        selectedCategories.length === 0 || selectedCategories.includes(app.category);
      const matchesDeveloperFilter =
        selectedDevelopers.length === 0 || selectedDevelopers.includes(app.developerId);
      const matchesSearch =
        !query ||
        app.name.toLocaleLowerCase().includes(query) ||
        app.developer.toLocaleLowerCase().includes(query) ||
        app.repo.toLocaleLowerCase().includes(query);
      return matchesFilter && matchesCategoryFilter && matchesDeveloperFilter && matchesSearch;
    });
  }, [appsMap, filter, searchQuery, selectedCategories, selectedDevelopers]);
  return { apps, isLoading, error };
}
