/**
 * Module Registration
 * This file registers all available modules with the registry
 */

import { moduleRegistry } from './ModuleRegistry'
import { DiagramModule } from '../modules/diagrams'
import { MindMapModule } from '../modules/mindmap'
import { FlowchartModule } from '../modules/flowchart'

// Register the Diagrams module as default
moduleRegistry.register(DiagramModule, { isDefault: true })

// Register the Mind Map module
moduleRegistry.register(MindMapModule)

// Register the Flowchart module
moduleRegistry.register(FlowchartModule)

export { moduleRegistry }
