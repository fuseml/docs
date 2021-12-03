## Installation of 3rd party tools and services with the FuseML installer

## Overview

The FuseML installer can be used for more than installing FuseML itself. It can also be used to manage the installation of third-party tools and services and their subsequent registration in [the FuseML Extension Registry](extension-registry.md), where they can be referenced and accessed from FuseML workflows.

The installer makes a clear distinction between basic mandatory components and extensions for 3rd party tools, but at the same time provides the "all-in-one" experience of installing everything in one shot. Furthermore, the installer is flexible in that it can be extended dynamically to cover more third-party tools and services that are not included in the default tool stack maintained by the FuseML team, by defining new [Installer Extensions](#installer-extensions) and grouping them under a custom [Installer Extension Repository](#installer-extension-repository).

The [default FuseML Installer Extension Repository](https://github.com/fuseml/extensions/tree/release-0.3/installer) includes a variety of AI/ML tools that can be installed through the FuseML installer. The repository is maintained by the FuseML team and is updated regularly.

## Installer Extensions

An installer extension is represented by a `description.yaml` YAML file that provides a description of the operations that are needed to install and uninstall a third-party application. The installer extensions are designed to be used with cloud-native applications that can be deployed in a Kubernetes cluster, but they can also be used with other types of infrastructures and deployment models.

The following is an example of an installer extension descriptor defined for KServe:

```yaml
name: kserve
product: kserve
version: "0.7.0"
description: |
  Serverless Inferencing on Kubernetes
requires:
  - knative
  - cert-manager
install:
  - type: manifest
    location: https://github.com/kserve/kserve/releases/download/v0.7.0/kserve.yaml
    waitfor:
      - namespace: kserve
        selector: control-plane=kserve-controller-manager
  - type: kustomize
    location: kustomize
    waitfor:
      - namespace: kserve
        selector: app.kubernetes.io/component=kserve-models-web-app
uninstall:
  - type: kustomize
    location: kustomize
  - type: manifest
    location: https://github.com/kserve/kserve/releases/download/v0.7.0/kserve.yaml
services:
  - id: API
    resource: kserve-api
    category: prediction-serving
    description: kserve prediction service API
    endpoints:
      - url: http://kubernetes.default.svc
        type: internal
  - id: UI
    resource: kserve-ui
    category: UI
    description: KServe UI
gateways:
  - name: kserve-web-app
    namespace: kserve
    servicehost: kserve-models-web-app
    port: 80
rolerules:
  - apigroups:
      - serving.kserve.io
    resources:
      - inferenceservices
    verbs:
      - get
      - list
      - create
      - patch
      - watch
```

The descriptor specifies a list of installation and un-installation steps, such as Kubernetes manifests and Kustomize files, that have to be executed in order to deploy the application or to subsequently remove it from a Kubernetes cluster. The other fields in the descriptor are used to describe the application, its capabilities and its permission requirements.

The extension descriptor is broken down into sections and explored piece by piece in the following paragraphs.

```yaml
name: kserve
product: kserve
version: "0.7.0"
description: |
  Serverless Inferencing on Kubernetes
[...]
```

This part is self explanatory. The `name` field is the extension identifier that along with the `product`, `version` and `description` fields is used to populate the [Extension Record](extension-registry.md#extension-records) that FuseML will use to register KServe as an extension in the [FuseML Extension Registry](extension-registry.md) after installation.

```yaml
[...]
requires:
  - knative
  - cert-manager
[...]
```

Extensions can depend on other extensions. If a description file contains a `requires` field, the value is expected to be a list of names of other extensions that are considered requirements for the current one. The FuseML installer will take care to install all dependencies in the right order, so they do not need to be explicitly listed on the command line.

```yaml
[...]
install:
  - type: manifest
    location: https://github.com/kserve/kserve/releases/download/v0.7.0/kserve.yaml
    waitfor:
      - namespace: kserve
        selector: control-plane=kserve-controller-manager
  - type: kustomize
    location: kustomize
    waitfor:
      - namespace: kserve
        selector: app.kubernetes.io/component=kserve-models-web-app
uninstall:
  - type: kustomize
    location: kustomize
  - type: manifest
    location: https://github.com/kserve/kserve/releases/download/v0.7.0/kserve.yaml
[...]
```

The `install` and `uninstall` sections list the steps necessary to install, configure and uninstall the extension. KServe is installed through a combination of Kubernetes manifests and Kustomize files. The following types of installation mechanisms are currently supported:

- `helm` - helm chart
- `manifest` - plain Kubernetes manifest, to be installed using `kubectl`. All information is expected to be present in the manifest file.
- `kustomize` - Kustomize deployment. It can be a URL (i.e. one that works as an input for `kubectl -k`) or an absolute or relative path to a local directory with Kustomize files.
- `script` - manage the installation/uninstallation through shell scripts. Specific `install` and `uninstall` actions need to be provided by way of referencing specific shell scripts.

Location arguments can be configured for every type of step to point to external resources, such as helm charts, Kubernetes manifests, Kustomize directories and shell scripts:

- `location`: could be either a URL or a local path relative to the extension directory. If used together with a helm chart, `location` needs to point to tarball with the chart.
- `repo`, `chart` and `version`: specific to helm charts only. `repo` is the chart repository from which the chart with `chart` name and the `version` version should be installed. To use this combination, the `location` field must be empty.
- `values`: points to a customized `values.yaml` file used in combination with a helm chart. Just like `location`, it can be a URL or a local path.

Each step can have its own `namespace` explicitly configured. If omitted, the global `namespace` attribute is used. If this is also missing or empty, the FuseML installer will not use any namespace during the step operation.

After the instruction from an installation step is executed, it is sometimes wise to wait until a certain condition is met to make sure the installer may continue to the next step. The `waitfor` section may be used to indicate a specific condition the installer should wait for. It takes the arguments that could generally be passed to `kubectl wait` command.
The currently supported arguments are:

- `kind` (if missing, defaults to `pod`)
- `namespace`
- `condition` (defaults to `ready`)
- `timeout` (in seconds; defaults to 300)
- `selector`. If the value of `selector` is `all`, FuseML will wait for all resources of given `kind` to reach the indicated `condition`. Otherwise, the `selector` value is treated like the value for the `--selector` option for the `kubectl wait` command.

```yaml
[...]
services:
  - id: API
    resource: kserve-api
    category: prediction-serving
    description: kserve prediction service API
    endpoints:
      - url: http://kubernetes.default.svc
        type: internal
  - id: UI
    resource: kserve-ui
    category: UI
    description: KServe UI
[...]
```

The `services` section provides information that is reflected in the generated Extension Descriptor that FuseML will use to register the extension in the [FuseML Extension Registry](extension-registry.md), more specifically in the `services` field of the Extension Record. For more information about the fields that can be configured in the services section, see [Extension Descriptor](extension-registry.md#extension-records).

!!! note

    The `services` field should only be configured for extensions that expose APIs that need to be accessed from the FuseML workflows. Extensions that are not meant to interact with FuseML workflows (e.g. those that are only used as functional dependencies for other extensions) do not need to have this field filled in and will be ignored by FuseML in relation with workflows.

```yaml
[...]
gateways:
  - name: kserve-web-app
    namespace: kserve
    servicehost: kserve-models-web-app
    port: 80
[...]
```

Some Kubernetes applications such as KServe don't include means of exposing the provided services in their official deployment manifests (e.g. Ingress, Load Balancer or Istio Gateway). When the `gateways` field is specified in the descriptor, the FuseML installer will also create one Istio gateway corresponding to each entry.

```yaml
[...]
rolerules:
  - apigroups:
      - serving.kserve.io
    resources:
      - inferenceservices
    verbs:
      - get
      - list
      - create
      - patch
      - watch
```

Some third party AI/ML services, like KServe, come in the form of Kubernetes operators that have associated CRD. To have access to these resources, the workflow steps need to have additional permissions granted to them. The `rolerules` section can be used to provide the list of permissions (Kubernetes roles) that need to be granted to FuseML workflow steps that need to access the extension. The syntax is the same as for the [Kubernetes Role object](https://kubernetes.io/docs/reference/access-authn-authz/rbac/), i.e. it is expected to contain ApiGroups, Resources and Verbs values.

!!! note

    All steps in a FuseML workflow are executed in the `fuseml-workloads` Kubernetes namespace and in the context of the `fuseml-workloads` service account. For 3rd party tools that are not installed using installer extensions, or that do not include `rolerules` in the extension descriptor, the admin must manually add the required permissions to the `fuseml-workloads` service account. FuseML automatically adds the permissions listed in the `rolerules` section to the mentioned service account.

For more examples of extension descriptors and how to build them, take a look at the [Installer Extension Repository maintained by the FuseML team](https://github.com/fuseml/extensions/tree/release-0.3/installer)

## Installer Extension Repository

Installer extensions have to be organized using a particular directory structure to be recognized by the FuseML installer. A FuseML installer extension repository is a directory (local or remote) containing description files of extensions. Each extension has its own subdirectory that matches the extension name. Mandatory component under each extension subdirectory is the `description.yaml` file.

Example directory structure:

```
extensions
  - mlflow
    - description.yaml
    - values.yaml
  - knative
    - description.yaml
    - install.sh
    - uninstall.sh
```

The FuseML installer defaults to using the [Installer Extension Repository maintained by the FuseML team](https://github.com/fuseml/extensions/tree/release-0.3/installer). To point it to a different location, the optional `--extension-repository` command line argument can be used.




