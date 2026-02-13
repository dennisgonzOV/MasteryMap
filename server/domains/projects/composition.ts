import { createProjectsRouters } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { projectsStorage, type IProjectsStorage } from "./projects.storage";

interface ProjectsDomainDependencies {
  storage?: IProjectsStorage;
}

export function createProjectsDomain(dependencies: ProjectsDomainDependencies = {}) {
  const storage = dependencies.storage ?? projectsStorage;
  const service = new ProjectsService(storage);
  const routers = createProjectsRouters(service);

  return {
    service,
    ...routers,
  };
}
