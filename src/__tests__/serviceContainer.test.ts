import { ServiceIdentifier } from "../ServiceIdentifier";
import { ServiceCollection } from "../ServiceCollection";
import { ServiceDescriptor } from "../ServiceDescriptor";
import { ServiceContainer } from "../ServiceContainer";
import { optional } from "../optional";
import { many } from "../many";
import { Disposable } from "@esfx/disposable";

describe("parameters", () => {
    describe("required", () => {
        it("when none", () => {
            const IPart = ServiceIdentifier.create("IPart");
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                constructor(
                    @IPart readonly part: unknown
                ) {}
            }
            const services = new ServiceCollection();
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            expect(() => container.getService(IRoot)).toThrow();        
        });
        it("when one", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                constructor(
                    @IPart readonly part: unknown
                ) {}
            }
            const services = new ServiceCollection();
            services.set(IPart, ServiceDescriptor.forClass(PartA));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.part).toBeInstanceOf(PartA);
        });
        it("when many", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            class PartB { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                constructor(
                    @IPart readonly part: unknown
                ) {}
            }
            const services = new ServiceCollection();
            services.add(IPart, ServiceDescriptor.forClass(PartA));
            services.add(IPart, ServiceDescriptor.forClass(PartB));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            expect(() => container.getService(IRoot)).toThrow();
        });
    });
    describe("optional", () => {
        it("when none", () => {
            const IPart = ServiceIdentifier.create("IPart");
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                constructor(
                    @optional(IPart) readonly part: unknown
                ) {}
            }
            const services = new ServiceCollection();
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.part).toBeUndefined();
        });
        it("when one", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                constructor(
                    @optional(IPart) readonly part: unknown
                ) {}
            }
            const services = new ServiceCollection();
            services.set(IPart, ServiceDescriptor.forClass(PartA));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.part).toBeInstanceOf(PartA);
        });
        it("when many", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            class PartB { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                constructor(
                    @optional(IPart) readonly part: unknown
                ) {}
            }
            const services = new ServiceCollection();
            services.add(IPart, ServiceDescriptor.forClass(PartA));
            services.add(IPart, ServiceDescriptor.forClass(PartB));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            expect(() => container.getService(IRoot)).toThrow();
        });
    });
    describe("many", () => {
        it("when none", () => {
            const IPart = ServiceIdentifier.create("IPart");
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                constructor(
                    @many(IPart) readonly parts: unknown[]
                ) {}
            }
            const services = new ServiceCollection();
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.parts).toEqual([]);
        });
        it("when one", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA {}
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                constructor(
                    @many(IPart) readonly parts: unknown[]
                ) {}
            }
            const services = new ServiceCollection();
            services.set(IPart, ServiceDescriptor.forClass(PartA));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.parts.length).toBe(1);
            expect(root.parts[0]).toBeInstanceOf(PartA);
        });
        it("when many", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA {}
            class PartB {}
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                constructor(
                    @many(IPart) readonly parts: unknown[]
                ) {}
            }
            const services = new ServiceCollection();
            services.add(IPart, ServiceDescriptor.forClass(PartA));
            services.add(IPart, ServiceDescriptor.forClass(PartB));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.parts.length).toBe(2);
            expect(root.parts[0]).toBeInstanceOf(PartA);
            expect(root.parts[1]).toBeInstanceOf(PartB);
        });
    });
    it("circularity", () => {
        const IPart = ServiceIdentifier.create<Part>("IPart");
        const IRoot = ServiceIdentifier.create<Root>("IRoot");
        class Part { constructor(@IRoot root: Root) {} }
        class Root { constructor(@IPart part: Part) {} }
        const services = new ServiceCollection();
        services.add(IPart, ServiceDescriptor.forClass(Part));
        services.add(IRoot, ServiceDescriptor.forClass(Root));
        const container = new ServiceContainer(services);
        expect(() => container.getService(IRoot)).toThrow();
    });
});
describe("properties", () => {
    describe("required", () => {
        it("when none", () => {
            const IPart = ServiceIdentifier.create("IPart");
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                @IPart readonly part: unknown
            }
            const services = new ServiceCollection();
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            expect(() => container.getService(IRoot)).toThrow();        
        });
        it("when one", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                @IPart readonly part: unknown
            }
            const services = new ServiceCollection();
            services.set(IPart, ServiceDescriptor.forClass(PartA));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.part).toBeInstanceOf(PartA);
        });
        it("when many", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            class PartB { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                @IPart readonly part: unknown
            }
            const services = new ServiceCollection();
            services.add(IPart, ServiceDescriptor.forClass(PartA));
            services.add(IPart, ServiceDescriptor.forClass(PartB));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            expect(() => container.getService(IRoot)).toThrow();
        });
    });
    describe("optional", () => {
        it("when none", () => {
            const IPart = ServiceIdentifier.create("IPart");
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                @optional(IPart) readonly part: unknown
            }
            const services = new ServiceCollection();
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.part).toBeUndefined();
        });
        it("when one", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                @optional(IPart) readonly part: unknown
            }
            const services = new ServiceCollection();
            services.set(IPart, ServiceDescriptor.forClass(PartA));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.part).toBeInstanceOf(PartA);
        });
        it("when many", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA { }
            class PartB { }
            const IRoot = ServiceIdentifier.create<Root>();
            class Root {
                @optional(IPart) readonly part: unknown
            }
            const services = new ServiceCollection();
            services.add(IPart, ServiceDescriptor.forClass(PartA));
            services.add(IPart, ServiceDescriptor.forClass(PartB));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            expect(() => container.getService(IRoot)).toThrow();
        });
    });
    describe("many", () => {
        it("when none", () => {
            const IPart = ServiceIdentifier.create("IPart");
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                @many(IPart) readonly parts!: readonly unknown[];
            }
            const services = new ServiceCollection();
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.parts).toEqual([]);
        });
        it("when one", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA {}
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                @many(IPart) readonly parts!: unknown[];
            }
            const services = new ServiceCollection();
            services.set(IPart, ServiceDescriptor.forClass(PartA));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.parts.length).toBe(1);
            expect(root.parts[0]).toBeInstanceOf(PartA);
        });
        it("when many", () => {
            const IPart = ServiceIdentifier.create("IPart");
            class PartA {}
            class PartB {}
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                @many(IPart) readonly parts!: unknown[];
            }
            const services = new ServiceCollection();
            services.add(IPart, ServiceDescriptor.forClass(PartA));
            services.add(IPart, ServiceDescriptor.forClass(PartB));
            services.set(IRoot, ServiceDescriptor.forClass(Root));
            const container = new ServiceContainer(services);
            const root = container.getService(IRoot);
            expect(root.parts.length).toBe(2);
            expect(root.parts[0]).toBeInstanceOf(PartA);
            expect(root.parts[1]).toBeInstanceOf(PartB);
        });
    });
    it("circularity", () => {
        const IPart = ServiceIdentifier.create<Part>("IPart");
        const IRoot = ServiceIdentifier.create<Root>("IRoot");
        class Part { @IRoot readonly root!: Root; }
        class Root { @IPart readonly part!: Part; }
        const services = new ServiceCollection();
        services.add(IPart, ServiceDescriptor.forClass(Part));
        services.add(IRoot, ServiceDescriptor.forClass(Root));
        const container = new ServiceContainer(services);
        const root = container.getService(IRoot);
        expect(root.part).toBeInstanceOf(Part);
        expect(root.part.root).toBe(root);
    });
});
describe("containers", () => {
    describe("nested", () => {
        it("get root", () => {
            const IPart = ServiceIdentifier.create<Part>("IPart");
            class Part {}
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root { constructor(@IPart readonly part: Part) {} }
            const services1 = new ServiceCollection();
            services1.addClass(IPart, Part);
            const container1 = new ServiceContainer(services1);
            const services2 = new ServiceCollection();
            services2.addClass(IRoot, Root);
            const container2 = container1.createChild(services2);
            const root = container2.getService(IRoot);
            expect(root.part).toBeInstanceOf(Part);
        });
        it("two containers, shared part", () => {
            const IPart = ServiceIdentifier.create<Part>("IPart");
            class Part {}
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root { constructor(@IPart readonly part: Part) {} }
            const services1 = new ServiceCollection()
                .addClass(IPart, Part);
            const container1 = new ServiceContainer(services1);
            const services2 = new ServiceCollection()
                .addClass(IRoot, Root);
            const container2 = container1.createChild(services2);
            const root1 = container2.getService(IRoot);
            const services3 = new ServiceCollection()
                .addClass(IRoot, Root);
            const container3 = container1.createChild(services3);
            const root2 = container3.getService(IRoot);
            expect(root1).not.toBe(root2);
            expect(root1.part).toBe(root2.part);
        });
    });
    describe("disposable", () => {
        it("flat", () => {
            let partDisposed = false;
            const IPart = ServiceIdentifier.create<Part>("IPart");
            class Part {
                [Disposable.dispose]() {
                    partDisposed = true;
                }
            }
            const services1 = new ServiceCollection();
            services1.addClass(IPart, Part);
            const container1 = new ServiceContainer(services1);
            container1.getService(IPart);
            container1[Disposable.dispose]();
            expect(partDisposed).toBe(true);
        });
        it("root", () => {
            let partDisposed = false;
            const IPart = ServiceIdentifier.create<Part>("IPart");
            class Part {
                [Disposable.dispose]() {
                    partDisposed = true;
                }
            }
            const services1 = new ServiceCollection();
            services1.addClass(IPart, Part);
            const container1 = new ServiceContainer(services1);
            const services2 = new ServiceCollection();
            const container2 = container1.createChild(services2);
            container2.getService(IPart);
            container1[Disposable.dispose]();
            expect(partDisposed).toBe(true);
        });
        it("nested", () => {
            let partDisposed = false;
            let rootDisposed = false;
            const IPart = ServiceIdentifier.create<Part>("IPart");
            class Part {
                [Disposable.dispose]() {
                    partDisposed = true;
                }
            }
            const IRoot = ServiceIdentifier.create<Root>("IRoot");
            class Root {
                constructor(@IPart readonly part: Part) {}
                [Disposable.dispose]() {
                    rootDisposed = true;
                }
            }
            const services1 = new ServiceCollection();
            services1.addClass(IPart, Part);
            const container1 = new ServiceContainer(services1);
            const services2 = new ServiceCollection();
            services2.addClass(IRoot, Root);
            const container2 = container1.createChild(services2);
            container2.getService(IRoot);
            container2[Disposable.dispose]();
            expect(partDisposed).toBe(false);
            expect(rootDisposed).toBe(true);
        });
    });
});