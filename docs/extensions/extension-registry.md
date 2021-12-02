# FuseML Extension Registry

## Overview

FuseML maintains a central registry where it keeps information about the available extensions and 3rd party tools that it integrates with. This information can be interactively consumed by users, but more importantly, is available as input for workflows and for other control plane features that we plan to add to FuseML in the future, such as multi-cluster AI/ML resource and service management.

The immediate application of an extension registry is to provide a place where endpoints, URLs, credentials and other data required to access 3rd party AI/ML tools like data stores, artifact stores, hyperparameter tuning and distributed training tools and prediction service platforms can be stored and accessed by the container images implementing workflow steps.

The information in the Extension Registry can be populated by end users [through the CLI](../cli.md#extensions) or [through the REST API](../api.md). In addition to explicit registration, the FuseML installer automatically handles all registration and de-registration matters for the 3rd party tools and services that are installed through it.

To understand what information is needed to _model and register your own instance of AI/ML tool or service as a FuseML extension_ and then _reference it and access it from FuseML workflows_, please proceed to the next sections describing the [Extension Record format](#extension-records) and the [workflow extension references](#referencing-extensions-in-workflows).

To explore more on the use-cases for which the Extension Registry was intended, please refer to the [Extension Registry Use Cases section](#extension-registry-use-cases).

## Extension Records

The structure of the information captured in the Extension Registry (i.e. the Extension Records) is based on common architectural and deployment patterns and abstractions exhibited by and extracted from a wide range of AI/ML tools and services, but is particularly suitable to describe cloud-native applications and services. The Extension Record is represented by a hierarchy of elements (services, endpoints, credentials and configuration) that can be used to model any 3rd party service in a form that can be easily referenced and consumed by FuseML and automated workflows.

Below is an example of an Extension Record describing an MLFlow server instance deployed in a Kubernetes cluster. In fact, it is the exact Extension Record that is automatically registered when MLFlow is installed using the FuseML installer.

```yaml
id: mlflow
product: mlflow
version: 1.20.2
description: |
  MLFlow is an open source platform specialized in tracking ML experiments, and packaging and deploying ML models.
services:
- id: mlflow-tracking
  resource: mlflow-tracking
  category: experiment-tracking
  authrequired: false
  description: MLFlow experiment tracking service API and UI
  endpoints:
  - url: http://mlflow.mlflow
    type: internal
    configuration:
      MLFLOW_TRACKING_URI: http://mlflow.mlflow
- id: mlflow-store
  resource: s3
  category: model-store
  authrequired: true
  description: MLFlow minio S3 storage back-end
  endpoints:
  - url: http://mlflow-minio.mlflow:9000
    type: internal
    configuration:
      MLFLOW_S3_ENDPOINT_URL: http://mlflow-minio.mlflow:9000
  credentials:
  - id: default-s3-account
    default: false
    scope: global
    projects: []
    users: []
    configuration:
      AWS_ACCESS_KEY_ID: <hidden>
      AWS_SECRET_ACCESS_KEY: <hidden>
```

As can be seen from the descriptor, an MLFlow server consists of two services: the experiment tracking service and the artifact store. The experiment tracking service is responsible for tracking and visualizing ML experiments. The artifact store (in our case backed by [minio - an S3 object store](https://min.io/)) is the service responsible for storing ML artifacts, such as ML models, datasets and logs. Services have individual endpoints through which they can be accessed. The artifact store in particular requires authentication, which is why credentials are also provided.

!!! note

    In different circumstances, we wouldn't need to include the artifact store back-end as a separate service in the extension descriptor, for example if the MLflow tracking server API would act as a central proxy intermediating uploading and downloading of artifacts. However, in this case, the external clients need to interact directly with the MLflow artifact store back-end to upload/download artifacts, which is why we need to cover it as a standalone service under the same extension.

Next, let's take a closer look at the different sections (elements) that make up an Extension Record and explore their utility:

```yaml
id: mlflow
product: mlflow
version: 1.20.2
description: |
  MLFlow is an open source platform specialized in tracking ML experiments, and packaging and deploying ML models.
```

An Extension Record is identified by its `id` and represents a single instance or installation of a framework/platform/service/product developed and released or hosted under a unique name and operated as a single cohesive unit. Different installations of the same product can be grouped together based on the `product` and `version` they were installed from. They can also be grouped together based on the the infrastructure domain (i.e. location, region, zone, area or kubernetes cluster) where the extension is running, based on a `zone` identifier (not depicted here).

```yaml
[...]
services:
- id: mlflow-tracking
  resource: mlflow-tracking
  category: experiment-tracking
  authrequired: false
  description: MLFlow experiment tracking service API and UI
  [...]
- id: mlflow-store
  resource: s3
  category: model-store
  authrequired: true
  description: MLFlow minio S3 storage back-end
  [...]
```

Several individual `services`, that can be consumed separately, can be provided by the same extension. In our example, an MLFlow instance is composed of an experiment tracking service API/UI and an artifact store service. A `service` is represented by a single exposed API or UI. For extensions implemented as cloud-native applications, a `service` is the equivalent of a Kubernetes service that is used to expose a public API or UI. `Services` are also classified into known resource types (e.g. s3, git, ui) and service categories (e.g. model store, feature store, prediction platform), to make it easier to create _portable workflows_: where a workflow step lists a service type and/or a category as a requirement, and FuseML automatically resolves that to whatever particular service instance is available at runtime. Together with the extension `product` and `version`, the resource type and service category can be used to uniquely identify a service or group of services independently of how and where they are deployed.

```yaml
services:
- id: mlflow-tracking
  [...]
  endpoints:
  - url: http://mlflow.mlflow
    type: internal
- id: mlflow-store
  [...]
  endpoints:
  - url: http://mlflow-minio.mlflow:9000
    type: internal
```

A `service` is exposed through several individual `endpoints`. Having a list of `endpoints` associated with a single `service` is particularly important for representing Kubernetes services, which can be exposed both internally (cluster IP) and externally (e.g. ingress or load balancer IP). Depending on the consumer location, FuseML can choose the endpoint that is accessible to and closer to the consumer. All `endpoints` grouped under the same `service` must be equivalent in the sense that they are backed by the same API and/or protocol. Our example only features internal endpoints; this implies that the APIs can only be consumed by automated FuseML workflows that are running in the same Kubernetes cluster as the MLflow server instance.

```yaml
services:
[...]
- id: mlflow-store
  [...]
  credentials:
  - id: default-s3-account
    default: false
    scope: global
    projects: []
    users: []
    configuration:
      AWS_ACCESS_KEY_ID: <hidden>
      AWS_SECRET_ACCESS_KEY: <hidden>
```

A `service` can be accessed using one of several sets of `credentials`. A set of `credentials` can be generally used to embed information pertaining to the authentication and authorization features supported by a service. This element allows administrators and operators of 3rd party tools integrated with FuseML to configure different accounts and credentials (tokens, certificates, passwords) to be associated with different FuseML organization entities (users, projects, groups etc.). In our MLflow case, all clients, FuseML workflows included, need S3 credentials to be able to upload/download artifacts from the S3 artifact store.

```yaml
[...]
services:
- id: mlflow-tracking
  [...]
  endpoints:
  - url: http://mlflow.mlflow
    type: internal
    configuration:
      MLFLOW_TRACKING_URI: http://mlflow.mlflow
- id: mlflow-store
  [...]
  endpoints:
  - url: http://mlflow-minio.mlflow:9000
    type: internal
    configuration:
      MLFLOW_S3_ENDPOINT_URL: http://mlflow-minio.mlflow:9000
  credentials:
  - id: default-s3-account
    [...]
    configuration:
      AWS_ACCESS_KEY_ID: <hidden>
      AWS_SECRET_ACCESS_KEY: <hidden>
```

`Configuration` elements can be present under the top level as well as the `services`, `endpoints` and `credentials` elements and represent opaque, service specific configuration data that the consumers need in order to access a service interface. `Configuration` elements can be used to encode any information relevant for service clients: accounts and credentials, information describing the service or particular configuration parameters that describe how the service should be used. For example, if endpoints are SSL secured, custom certificates (e.g. self-signed CA certificates or client certificates) might be needed to access them and this should be included in the endpoint configuration. The information encoded in a `configuration` element is treated as sensitive information (stored securely and not exposed through the API) when present under `credentials`. These are the equivalent of Kubernetes configmaps (or secrets, when under `credentials`).

### Extension Examples

This section contains more Extension Record examples, featuring some common configurations and scenarios.

1. an MLFlow instance deployed locally alongside FuseML and globally accessible. This is similar to the example analyzed in the previous section, but also includes external endpoints:

    ```yaml
    id: mlflow-0001
    product: mlflow
    version: "1.19.0"
    description: MLFlow experiment tracking and artifact store
    zone: cluster-alpha
    services:
      - id: mlflow-tracking
        resource: mlflow-tracking
        category: experiment-tracking
        description: MLFlow experiment tracking service API and UI
        endpoints:
          - url: http://mlflow.mlflow
            type: internal
            configuration:
              MLFLOW_TRACKING_URI: http://mlflow.mlflow
          - url: http://mlflow.10.110.120.130.nip.io
            type: external
            configuration:
              MLFLOW_TRACKING_URI: http://mlflow.10.110.120.130.nip.io
      - id: mlflow-store
        resource: s3
        category: model-store
        description: MLFlow minio S3 storage back-end
        credentials:
          - id: default-s3-account
            scope: global
            configuration:
              AWS_ACCESS_KEY_ID: 24oT0SfbJPEu6kUbUKsH
              AWS_SECRET_ACCESS_KEY: cMGiZff8KqS5xWQ4eagRujh1tDcbQyRP0bEJSBOf
        endpoints:
          - url: http://mlflow-minio.mlflow:9000
            type: internal
            configuration:
              MLFLOW_S3_ENDPOINT_URL: http://mlflow-minio.mlflow:9000
          - url: http://minio.10.110.120.130.nip.io
            type: external
            configuration:
              MLFLOW_S3_ENDPOINT_URL: http://minio.10.110.120.130.nip.io
    ```

2. example showing that the minio service deployed as a sub-component of the previous MLFlow instance can also be registered as a generic minio/S3 service, although this is not recommended, because even though the S3 service can be accessed and used independently of the parent MLflow tracking server, the way that artifact store data is organized and stored in the S3 back-end is specific to MLFlow and should be discoverable as such:

    ```yaml
    id: mlflow-model-store-0001
    product: minio
    version: "4.1.3"
    description: Minio S3 storage service
    zone: cluster-alpha
    services:
      - id: s3
        resource: s3
        category: object-storage
        description: MLFlow minio S3 storage back-end
        credentials:
          - id: default
            scope: global
            configuration:
              AWS_ACCESS_KEY_ID: 24oT0SfbJPEu6kUbUKsH
              AWS_SECRET_ACCESS_KEY: cMGiZff8KqS5xWQ4eagRujh1tDcbQyRP0bEJSBOf
        endpoints:
          - url: http://mlflow-minio.mlflow:9000
            type: internal
          - url: http://mlflow.10.110.120.130.nip.io
            type: external
    ```

3. example of an extension record for a 3rd party Gitea instance running in a zone other than FuseML. A dedicated `fuseml-admin` Gitea user was configured explicitly for FuseML and the credentials are provided in the extension record: 

    ```yaml
    id: gitea-devel-rd
    product: gitea
    version: "1.14.3"
    description: Gitea version control server running in the R&D cloud
    zone: rd-cloud
    services:
      - id: git_https
        resource: git+https
        category: VCS
        description: Gitea git/http API
        endpoints:
          - url: https://gitea.rd-cloud.mydomain.org
            type: external
        credentials:
          - id: admin
            scope: global
            configuration:
              username: fuseml-admin
              password: 8KqS5xWQ4eagRu
    ```

4. example showing two different extension records, instances of different products, that provide the same type of resource/API. FuseML reusable workflows can reference any of these extension instances with a `resource: s3` selector and FuseML will connect them at runtime to the one that is available in the zone where they're running:

    ```yaml
    id: minio-s3-storage
    product: minio
    version: "4.1.3"
    description: Minio S3 storage services
    zone: development-cluster
    services:
      - id: s3
        resource: s3
        category: object-storage
        description: Minio S3 storage deployed in the development cluster
        credentials:
          - id: local-minio
            scope: global
            configuration:
              AWS_ACCESS_KEY_ID: 24oT0SfbJPEu6kUbUKsH
              AWS_SECRET_ACCESS_KEY: cMGiZff8KqS5xWQ4eagRujh1tDcbQyRP0bEJSBOf
        endpoints:
          - url: http://minio.minio:9000
            type: internal
          - url: http://minio.10.110.120.130.nip.io
            type: external
    ```

    ```yaml
    id: aws-object-storage
    product: aws-s3
    description: AWS cloud object storage
    zone: eu-central-1
    services:
      - id: aws
        resource: s3
        category: object-storage
        description: AWS S3 object storage
        credentials:
          - id: aws
            scope: global
            configuration:
              AWS_ACCESS_KEY_ID: sWRS24oT0SfbJPEu6kU3EWf
              AWS_SECRET_ACCESS_KEY: abl4SDcMGiZff8KqS5xWQ4eagRujh1tDcbQyRP0s
        endpoints:
          - url: https://s3.eu-central-1.amazonaws.com
            type: external
    ```

5. this next extension record shows KServe as an example of a Kubernetes controller running in the same cluster as FuseML. No credentials need to be configured, since the FuseML workflows are running in the same cluster and will be able to access the KServe API through the special Kubernetes service account configured by FuseML and in the context of which all workflow containers are running. The extension record also shows how the KServe UI is exposed as a second external service.

    !!! note

        The FuseML installer takes care of setting up the proper roles and permissions for the Kubernetes service account to access the KServe API, only if KServe is installed through the FuseML installer. Otherwise, the FuseML admin needs to explicitly configure additional roles and permissions for the `fuseml-workloads/fuseml-workloads` Kubernetes service account to allow the workflow containers to access the KServe API. 

    ```yaml
    id: kserve-local
    product: kserve
    version: "0.7.0"
    description: KServe prediction service platform running in the local cluster
    zone: cluster.local
    services:
      - id: API
        resource: kfserve-api
        category: prediction-serving
        description: KServe prediction service API
        endpoints:
          - url: https://kubernetes.default.svc
            type: internal
      - id: UI
        resource: kserve-ui
        category: UI
        description: KServe prediction platform UI
        endpoints:
          - url: https://kserve.10.120.130.140.nip.io/
            type: external
    ```

6. this extension record shows Seldon Core as an example of a Kubernetes service running in a cluster different than the one where FuseML is located and where workflows are executed. In this case, Kubernetes credentials need to be explicitly provided with the extension record to give the workflows access to the cluster API. The admin also decided to be more restrictive about how this remote cluster is used by FuseML and to configure explicit project-scope and user-scope credentials that only allow workflows running in the context of the FuseML projects `alpha` and `beta` to access it.

    ```yaml
    id: seldon-core-production
    product: seldon
    version: "1.11.0"
    zone: production-cluster-001
    description: Seldon Core inference serving platform running in production cluster
    services:
      - id: API
        resource: seldon-core-api
        category: prediction-serving
        description: Seldon Core prediction serving platform API
        credentials:
          - id: project-alpha
            scope: project
            projects:
              - alpha
            configuration:
              CLIENT_CERT: LS0tLS1CRUdJTiBDRVJUSUZJQ0FU[...]RS0tLS0tCk1JSUM4akNDQNBVEUtLS0tLQo=
              CLIENT_KEY: cMGiZff8KqS5xW[...]Q4eagRujh1tDcbQyRP0bEJSBOf
              CLUSTER_CERT_AUTH: VsSCsdfLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0[...]tLS0tCk1anF1TT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
          - id: user-alainturing
            scope: user
            projects:
              - alpha
              - beta
            users:
              - alainturing
            configuration:
              CLIENT_CERT: GHLS0t1CRUdJTiBDRVJUSUZJQ0F[...]URS0tLS0tCk1JSUM4akNDQWRxZ0F3BVEUtLS0tLQo=
              CLIENT_KEY: TyGiZff8KqS5xWQ4eag[...]Rujh1tDcbQyRP0bEJSBOf
              CLUSTER_CERT_AUTH: VsSCsdfLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0[...]tLS0tCk1anF1TT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
        endpoints:
          - url: https://production-cluster-xasf.example.com:6443
            type: external
        configuration:
          INSECURE: False
          namespace: prj_hys568
    ```

## Referencing Extensions in Workflows

FuseML workflows can reference extensions in the same way as other resources. An extension selector can be included in the definition of a workflow step to indicate the type and/or capabilities of one or more external services that the workflow step needs to interact with, such as a data store, an experiment tracking tool, an artifact store, or any other type of machine learning service that implements a function in the MLOps lifecycle. FuseML automatically connects the workflow steps to their required external services based on the information it finds in the extension selectors and the extension records that are available in the Extension Registry. 

The extension selector that can be specified for a workflow step has the following syntax:

```yaml
[...]
  steps:
  [...]
    - name: <step-name>
      [...]
      extensions:
        - name: <extension-selector-name>
          extension_id: <extension-id>
          service_id: <service-id>
          zone: <extension-zone>
          product: <extension-product>
          version: <extension-version-or-semantic-version-constraint>
          service_category: <service-category>
          service_resource: <service-resource>
```

FuseML users have a wide range of possibilities when it comes to referencing extensions in their workflows. A workflow step can be configured to request a particular service instance by defining a very strict extension selector, one that identifies the service instance explicitly by including its `extension_id` and `service_id`. This is the most restrictive way to reference an extension in a workflow and results in the least flexibility.

For more flexible and portable workflows, it is recommended to identify extensions and services by their product or the category of service and/or resource that they provide. This can be done by setting one or more of the fields `product`, `version`, `service_category` and `service_resource` in the extension selector. This approach creates workflows that are reusable and portable across different deployments, infrastructure zones and even products.

When a workflow is executed, FuseML maps all the `configuration` values gathered from the extension records that match the configured selectors and converts them into environment variables that are injected into the containers corresponding to each step. It is up the implementation of individual workflow steps to interpret the values of these environment variables and to use them to access the external services that they need to interact with. Furthermore, when the environment variables extracted from extension records don't map to what is expected by a workflow step container, the workflow can be configured to explicitly map these values to something else, as depicted in one of the examples in the next section.

### Extension Selector Examples

This section contains examples of extension selectors that can be used in workflows, featuring some common configurations and scenarios.

1. explicitly referencing a particular service instance by its `extension_id` and `service_id` in a workflow step:

    ```yaml
    [...]
    steps:
      [...]
      - name: trainer
        [...]
        extensions:
          - name: experiment-tracking
            extension_id: mlflow-0001
            service_id: mlflow-tracking
          - name: artifact-store
            extension_id: mlflow-0001
            service_id: mlflow-store
    ```

    Provided that the Extension Registry contains the MLflow extension record featured in the one of the extension records example:

    ```yaml
    id: mlflow-0001
    product: mlflow
    version: "1.19.0"
    description: MLFlow experiment tracking and artifact store
    zone: cluster-alpha
    services:
      - id: mlflow-tracking
        resource: mlflow-tracking
        category: experiment-tracking
        description: MLFlow experiment tracking service API and UI
        endpoints:
          - url: http://mlflow.mlflow
            type: internal
            configuration:
              MLFLOW_TRACKING_URI: http://mlflow.mlflow
          - url: http://mlflow.10.110.120.130.nip.io
            type: external
            configuration:
              MLFLOW_TRACKING_URI: http://mlflow.10.110.120.130.nip.io
      - id: mlflow-store
        resource: s3
        category: model-store
        description: MLFlow minio S3 storage back-end
        credentials:
          - id: default-s3-account
            scope: global
            configuration:
              AWS_ACCESS_KEY_ID: 24oT0SfbJPEu6kUbUKsH
              AWS_SECRET_ACCESS_KEY: cMGiZff8KqS5xWQ4eagRujh1tDcbQyRP0bEJSBOf
        endpoints:
          - url: http://mlflow-minio.mlflow:9000
            type: internal
            configuration:
              MLFLOW_S3_ENDPOINT_URL: http://mlflow-minio.mlflow:9000
          - url: http://minio.10.110.120.130.nip.io
            type: external
            configuration:
              MLFLOW_S3_ENDPOINT_URL: http://minio.10.110.120.130.nip.io
    ```

    , FuseML will resolve the extension selector to this extension record and its internal endpoints. The `configuration` values of the extension record will be mapped to the following implicit environment variables that passed to the container:

    ```yaml
    MLFLOW_TRACKING_URI: http://mlflow.mlflow
    MLFLOW_S3_ENDPOINT_URL: http://mlflow-minio.mlflow:9000
    AWS_ACCESS_KEY_ID: 24oT0SfbJPEu6kUbUKsH
    AWS_SECRET_ACCESS_KEY: cMGiZff8KqS5xWQ4eagRujh1tDcbQyRP0bEJSBOf
    ```

2. referencing a service independently of running instance, by using the product and service resource identifiers and including a version specifier to ensure compatibility:

    ```yaml
    [...]
    steps:
      [...]
      - name: predictor
        [...]
        extensions:
          - name: kserve
            product: kserve
            service_resource: kserve-api
            version: "~1.10.0"
    ```

3. example of a minimal reference, specifying only the resource type

    ```yaml
    [...]
    steps:
      [...]
      - name: trainer
        [...]
        extensions:
          - name: experiment-tracking
            service_resource: mlflow-tracking
          - name: artifact-store
            service_resource: s3
    ```

4. this workflow step explicitly uses FuseML workflow expressions to map new environment variable names to the configuration entries from the extension record instead of relying on the default ones extracted from the extension record. It also accesses other fields in the extension record to perform additional actions:

    ```yaml
    [...]
    steps:
      [...]
      - name: trainer
        [...]
        extensions:
          - name: experiment-tracking
            product: mlflow
            service_resource: mlflow-tracking
          - name: artifact-store
            product: mlflow
            service_resource: s3
        env:
          - name: S3_ACCESS_KEY_ID
            value: '{{ extension.artifact-store.cfg.AWS_ACCESS_KEY_ID }}'
          - name: S3_SECRET_ACCESS_KEY
            value: '{{ extension.artifact-store.cfg.AWS_SECRET_ACCESS_KEY }}'
          - name: MLFLOW_TRACKER_URL
            value: '{{ extension.experiment-tracking.url }}'
          - name: MLFLOW_TRACKER_VERSION
            value: '{{ extension.experiment-tracking.version }}'
          - name: MLFLOW_TRACKER_ZONE
            value: '{{ extension.experiment-tracking.zone }}'
    ```

5. a similar approach is to use the FuseML workflow expressions to expand fields in the extension record and use them as values for workflow step inputs:

    ```yaml
    [...]
    steps:
      [...]
      - name: trainer
        [...]
        inputs:
          [...]
          - name: s3_access_key
            value: '{{ extension.artifact-store.cfg.AWS_ACCESS_KEY_ID }}'
          - name: s3_secret_access_key
            value: '{{ extension.artifact-store.cfg.AWS_SECRET_ACCESS_KEY }}'
          - name: s3_endpoint_url
            value: '{{ extension.artifact-store.url }}'
        extensions:
          - name: artifact-store
            service_resource: s3
    ```

## Extension Registry Use Cases

The extension registry targets some of the following use-cases:

1. as an Ops engineer (MLOps/DevOps/ITOps), I need a way to configure my FuseML instance with the parameters required to dynamically integrate with 3rd party AI/ML tools (e.g. URLs, endpoints, credentials, other tool specific configuration attributes). For non-production environments, this requirement can also come from ML Engineers or even Data Scientists that are looking to quickly set up FuseML for experimentation purposes.

    Examples:

    * Data Scientist: I have an MLFlow tracking service already set up by me that I use for my ML experiments and I want to reuse it for FuseML automated workflows. I will configure FuseML with the information it needs to access the MLFlow tracking service (the tracker service URL and the hostname, username and keys for the storage backend). The information is stored in a central registry where FuseML workflows can access it.
    * Data Scientist: I'm using my Google cloud storage account to store datasets or ML models that I use in my local experiments. I want my FuseML automated workflows to upload/download artifacts using that same storage account, but I don't want to expose my credentials in the workflow definition or in the code I'm pushing to FuseML. I'll store those credentials in the FuseML extension registry and access them from my FuseML workflow steps.
    * Ops engineer: I have an S3 storage service set up for my organization and I want to use that as a storage backend for FuseML artifacts (e.g. models, datasets).
    I will manage buckets, accounts and credentials and add them as extension records in the FuseML extension registry. ML engineers and DSs can then write FuseML workflows that have access to the S3 storage service without having to deal with these operational details.


2. as a ML engineer or Data Scientist, I need a list of the 3rd party tools that my FuseML instance is integrated with, to help me make decisions about how I implement and run my ML experiments and how I design my FuseML workflows

3. as a ML engineer or Data Scientist, I want to design FuseML workflows consisting of steps that interact with my AI/ML tool stack of choice, independently of how those tools are deployed. This makes my workflows generic and reusable:

    * FuseML workflow definitions don't need to be updated when there are changes in the configuration of the 3rd party tools (e.g. upgrade, migration) or in the way they are integrated with FuseML (e.g. change of accounts, change in access permissions or credentials)
    * configuring and integrating the tools with FuseML and configuring the FuseML workflows are independent operations and can be done by different roles requiring minimum interaction
    * a FuseML workflow, once defined, can be executed across multiple FuseML instances and 3rd party tools deployment configurations, as long as the same set of tools are involved

    Examples:

    * Data Scientist: I'm writing a FuseML workflow to automate the end-to-end lifecycle of my ML model. I wrote my ML code using MLFlow during the experimentation phase so I want to also use MLFlow as a tracking service and model store for my workflow. I also want to use Seldon Core as an inference service platform. These tools (MLFlow and Seldon Core) have already been installed by DevOps and set up as entries in the FuseML extension registry. All I need to do is specify in the definition of my FuseML workflows which step requires which extension, and the FuseML orchestrator will automatically make that information available to the container images implementing those steps. This way, I don't need to concern myself with endpoints, accounts or credentials.
    * Ops engineer: I need to migrate the on-prem S3 storage service used by my organization to a new location. I'm also using this storage service for a range of FuseML service instances in use by various AI/ML teams. All I need to do to re-configure the FuseML services is to update the entries I previously configured in their extension registries to point to the new URL. Future workflow executions will automatically pick-up the new values.
    * ML engineer: I'm using a staged approach to automating the deployment of my ML model in production. I have a development environment, a staging/testing environment and a production environment. I can write a complex FuseML workflow that I can reuse across these environments with minimal changes. The workflow definition is independent of how the 3rd party tools are deployed and set up for access by FuseML in these environments.


