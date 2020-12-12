import { CompleteHabitat } from "./buildings";

interface BuildingFactory {
    createCompleteHabitat(): CompleteHabitat;
}
