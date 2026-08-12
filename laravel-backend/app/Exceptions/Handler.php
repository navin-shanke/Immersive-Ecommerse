<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of exception types with their corresponding custom log levels.
     *
     * @var array<class-string<Throwable>, \Psr\Log\LogLevel::*>
     */
    protected $levels = [
        //
    ];

    /**
     * A list of the exception types that should not be reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        if ($this->isApiRequest($request)) {
            return $this->renderApiException($request, $e);
        }

        return parent::render($request, $e);
    }

    /**
     * Check if the request is an API request.
     */
    protected function isApiRequest(Request $request): bool
    {
        return $request->is('api/*');
    }

    /**
     * Render an exception for API requests.
     */
    protected function renderApiException(Request $request, Throwable $e): JsonResponse
    {
        $status = $this->getExceptionStatusCode($e);

        $data = [
            'message' => $e->getMessage(),
        ];

        if ($this->isDebugMode()) {
            $data['details'] = $this->getExceptionDetails($e);
        }

        return new JsonResponse($data, $status);
    }

    /**
     * Get the exception status code.
     */
    protected function getExceptionStatusCode(Throwable $e): int
    {
        if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
            return $e->getStatusCode();
        }

        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return 401;
        }

        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return 422;
        }

        return 500;
    }

    /**
     * Get exception details for debugging.
     */
    protected function getExceptionDetails(Throwable $e): array
    {
        return [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTrace(),
        ];
    }

    /**
     * Check if debug mode is enabled.
     */
    protected function isDebugMode(): bool
    {
        return config('app.debug', false);
    }
}
