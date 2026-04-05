import { HOME_USE_CASES, type HomeUseCase } from "./home-use-cases-data";

export const HOME_CONVERSATION_STARTER_USE_CASES = [
  getHomeUseCaseById("snake-game"),
  getHomeUseCaseById("one-page-pdf"),
  getHomeUseCaseById("create-plan"),
];

function getHomeUseCaseById(id: string): HomeUseCase {
  const useCase = HOME_USE_CASES.find((entry) => entry.id === id);
  if (!useCase) {
    throw new Error(`Missing home use case: ${id}`);
  }
  return useCase;
}
